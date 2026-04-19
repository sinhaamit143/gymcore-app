require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const path = require('path');
const webpush = require('web-push');
const multer = require('multer');
const fs = require('fs');

const prisma = new PrismaClient();

const writeLog = async (level, action, message, gymId = null, userId = null, metadata = {}) => {
  try {
    await prisma.systemLog.create({
      data: { level, action, gymId, userId, message, metadata }
    });
  } catch (err) {
    console.error('[LOG_FAILURE]', err.message);
  }
};

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
// Serve uploads folder under /api/uploads to be caught by Vite proxy automatically
app.use('/api/uploads', express.static(path.join(__dirname, 'public/uploads')));

// Configure Multer for logos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'public/uploads/logos';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// Configure Multer for post media
const postStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = `public/uploads/posts/${req.params.gymId || 'general'}`;
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}${path.extname(file.originalname)}`);
  }
});
const uploadPost = multer({
  storage: postStorage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit for video
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|mp4/;
    cb(null, allowed.test(path.extname(file.originalname).toLowerCase()));
  }
});

const JWT_SECRET = process.env.JWT_SECRET || 'gym_app_secret_key_123';

/* --- Web Push VAPID Keys --- */
const vapidKeys = webpush.generateVAPIDKeys();
webpush.setVapidDetails(
  'mailto:test@example.com',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

prisma.$connect()
  .then(() => {
    console.log('Connected to PostgreSQL via Prisma safely!');
    seedDatabase();
  })
  .catch(err => console.log('Prisma Error:', err));

const seedDatabase = async () => {
  try {
    let defaultGym = await prisma.gym.findFirst();
    if (!defaultGym) {
      defaultGym = await prisma.gym.create({ data: { name: 'GymCore Default Gym' } });
    }

    const adminExists = await prisma.user.findUnique({ 
      where: { email: 'admin@gymcore.com' },
      select: { id: true, email: true, role: true }
    });
    if (adminExists) {
      if (adminExists.role !== 'SUPER_ADMIN' && adminExists.role !== 'GYM_OWNER') {
        await prisma.user.update({
          where: { email: 'admin@gymcore.com' },
          data: { role: 'GYM_OWNER' }
        });
        console.log('✅ Updated existing admin@gymcore.com to have Admin privileges!');
      }
      return;
    }

    console.log('🌱 Admin missing. Seeding admin and test records...');

    const adminHash = await bcrypt.hash('admin123', 10);
    const adminUser = await prisma.user.create({
      data: {
        name: 'GymCore Admin',
        email: 'admin@gymcore.com',
        password: adminHash,
        role: 'GYM_OWNER',
        avatar: 'https://i.pravatar.cc/150?u=admin@gymcore.com',
        gymId: defaultGym.id
      }
    });

    const supaHash = await bcrypt.hash('supa123', 10);
    const superAdminUser = await prisma.user.create({
      data: {
        name: 'Supa Admin Master',
        email: 'supa@gymcore.com',
        password: supaHash,
        role: 'SUPER_ADMIN',
        avatar: 'https://i.pravatar.cc/150?u=supa@gymcore.com',
        gymId: null
      }
    });

    const userHash = await bcrypt.hash('password123', 10);
    const testUser = await prisma.user.create({
      data: {
        name: 'Demo Athlete',
        email: 'user@gymcore.com',
        password: userHash,
        avatar: 'https://i.pravatar.cc/150?u=user@gymcore.com',
        points: 15,
        gymId: defaultGym.id
      }
    });

    await prisma.workout.create({
      data: {
        userId: testUser.id,
        type: 'Push Day (Chest, Shoulders, Triceps)',
        duration: 60,
        calories: 450
      }
    });

    await prisma.nutrition.create({
      data: {
        userId: testUser.id,
        meal: 'Grilled Chicken & Quinoa',
        calories: 550,
        protein: 55,
        carbs: 60,
        fat: 10
      }
    });

    await prisma.post.create({
      data: {
        userId: testUser.id,
        content: 'Just started using GymCore! This app is amazing! 💪',
        likes: 12
      }
    });

    console.log('✅ Database successfully seeded! Admin: admin@gymcore.com | Pass: admin123');
  } catch (err) {
    console.error('Seed Error:', err);
  }
};



const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access denied' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

const requireAdmin = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user || (user.role !== 'GYM_OWNER' && user.role !== 'SUPER_ADMIN')) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    req.fullUser = user;
    next();
  } catch (err) { res.status(500).json({ error: err.message }); }
};

const requireSuperAdmin = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user || user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Super Admin access required' });
    }
    req.fullUser = user;
    next();
  } catch (err) { res.status(500).json({ error: err.message }); }
};

const updatePoints = async (userId, pointsToAdd) => {
  await prisma.user.update({
    where: { id: userId },
    data: { points: { increment: pointsToAdd } }
  });
};

// --- Auth Routes ---
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, gymId } = req.body;
    if (!name || !email || !password || !gymId) return res.status(400).json({ error: 'All fields including Gym ID are required' });
    
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ error: 'Email already exists' });
    
    const targetGym = await prisma.gym.findUnique({ where: { id: gymId } });
    if (!targetGym) return res.status(404).json({ error: 'Invalid Gym ID' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const safeAvatar = `https://i.pravatar.cc/150?u=${email}`;
    const user = await prisma.user.create({
      data: {
        name, email, password: hashedPassword,
        avatar: safeAvatar,
        gymId: targetGym.id
      },
      include: { gym: true }
    });
    
    const token = jwt.sign({ id: user.id, email }, JWT_SECRET, { expiresIn: '24h' });
    const cleanUser = { ...user, password: undefined };
    res.json({ token, user: cleanUser });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password, gymId } = req.body;
    const user = await prisma.user.findUnique({ 
      where: { email },
      select: { id: true, email: true, password: true, name: true, role: true, gymId: true }
    });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    // Super Admin must strictly use /supaadmin and cannot log into gym context
    if (user.role === 'SUPER_ADMIN' && gymId) {
       return res.status(401).json({ error: 'Super Admin cannot log into individual Gym context.' });
    }

    // Gym ID required for all non-global logins
    if (user.role !== 'SUPER_ADMIN' && !gymId) {
      return res.status(400).json({ error: 'Gym ID is required for login.' });
    }

    if (gymId && user.gymId !== gymId) {
      return res.status(401).json({ error: 'User does not belong to this Gym ID' });
    }
    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      await writeLog('WARN', 'LOGIN_FAILED', `Failed login attempt for email: ${email}`, null, null, { email, role: user.role });
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });
    await writeLog('INFO', 'CLIENT_LOGIN', `User ${user.name} logged in`, user.gymId, user.id, { role: user.role });
    const fullUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, email: true, name: true, role: true, gymId: true, avatar: true, phone: true, points: true, subscriptionPlan: true, subscriptionStatus: true },
    });
    const cleanUser = { ...fullUser, password: undefined };
    res.json({ token, user: cleanUser });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- User Routes ---
app.get('/api/user', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ 
      where: { id: req.user.id },
      select: { id: true, email: true, name: true, role: true, gymId: true, avatar: true, phone: true, points: true, subscriptionPlan: true, subscriptionStatus: true },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    const cleanUser = { ...user, password: undefined };
    res.json(cleanUser);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/user', authenticateToken, async (req, res) => {
  try {
    // Exclude protected fields
    const { id, role, email, password, gymId, points, ...safeData } = req.body;
    
    // Safety truncate avatar if massive string sent
    if (safeData.avatar && safeData.avatar.length > 500) {
      safeData.avatar = `https://i.pravatar.cc/150?u=${req.user.email}`;
    }

    await prisma.user.update({
      where: { id: req.user.id },
      data: safeData
    });
    res.json({ message: 'Profile updated' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/user/subscribe', authenticateToken, async (req, res) => {
  try {
    const { plan } = req.body;
    if (!['free', 'pro', 'elite'].includes(plan)) {
      return res.status(400).json({ error: 'Invalid subscription plan' });
    }
    
    await prisma.user.update({
      where: { id: req.user.id },
      data: { subscriptionPlan: plan }
    });
    
    res.json({ message: `Successfully subscribed to ${plan} plan!` });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/user/plans', authenticateToken, async (req, res) => {
  try {
    const plans = await prisma.assignedPlan.findMany({ 
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' }
    });

    await writeLog('INFO', 'CLIENT_UPDATED', `Updated client profile: ${user.name}`, user.gymId, req.user.id, { fields: Object.keys(updateData) });
    res.json(plans);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- Admin Routes ---
app.get('/api/admin/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: { gymId: req.fullUser.gymId, role: 'GYM_MEMBER' },
      orderBy: { createdAt: 'desc' }
    });
    console.log(`🔍 Admin fetch: Processing ${users.length} members. V:14.3`);
    
    const safeUsers = users.map(u => {
      if (u.avatar && u.avatar.length > 30000) {
        console.log(`⚠️  TRUNCATED: ${u.email} avatar was ${u.avatar.length} chars.`);
        u.avatar = `https://i.pravatar.cc/150?u=${u.email}`;
      }
      return { ...u, password: undefined };
    });
    
    res.json({ version: '14.2', users: safeUsers });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/admin/users/:id/role', authenticateToken, requireAdmin, async (req, res) => {
  try {
    if (req.params.id === req.user.id) {
       return res.status(400).json({ error: 'You cannot change your own role' });
    }
    const { role } = req.body;
    if (!['GYM_MEMBER', 'GYM_OWNER'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
    
    // Ensure target user belongs to admin's gym
    const targetUser = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!targetUser || targetUser.gymId !== req.fullUser.gymId) return res.status(403).json({error: 'Unauthorized'});

    await prisma.user.update({
      where: { id: req.params.id },
      data: { role }
    });
    res.json({ message: `User role updated to ${role}` });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/admin/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Ensure target user belongs to admin's gym
    const targetUser = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!targetUser || targetUser.gymId !== req.fullUser.gymId) return res.status(403).json({error: 'Unauthorized'});

    await prisma.user.delete({ where: { id: req.params.id } });
    res.json({ message: 'User deleted successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/admin/users/:id/details', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user || user.gymId !== req.fullUser.gymId) return res.status(404).json({ error: 'User not found' });
    
    const workouts = await prisma.workout.findMany({ where: { userId: user.id }, orderBy: { date: 'desc' }, take: 10 });
    const nutrition = await prisma.nutrition.findMany({ where: { userId: user.id }, orderBy: { date: 'desc' }, take: 10 });
    const plans = await prisma.assignedPlan.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' } });
    
    const cleanUser = { ...user, password: undefined };
    res.json({ user: cleanUser, workouts, nutrition, plans });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/admin/assign-plan', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { user_id, type, title, details } = req.body;
    
    const targetUser = await prisma.user.findUnique({ where: { id: user_id } });
    if (!targetUser || targetUser.gymId !== req.fullUser.gymId) return res.status(403).json({error: 'Unauthorized'});

    const plan = await prisma.assignedPlan.create({
      data: {
        userId: user_id,
        type, title, details
      }
    });

    await writeLog('INFO', 'CLIENT_CREATED', `Added new client: ${clientName}`, user.gymId, req.user.id, { email });
    res.status(201).json(plan);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- SupaAdmin Routes ---
app.get('/api/supaadmin/clients', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const clients = await prisma.user.findMany({
      where: { role: 'GYM_OWNER' },
      include: { gym: true },
      orderBy: { createdAt: 'desc' }
    });
    
    const formatted = clients.map(client => ({
      ...client,
      password: undefined
    }));
    
    res.json(formatted);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/supaadmin/clients', authenticateToken, requireSuperAdmin, upload.single('logo'), async (req, res) => {
  try {
    const { 
      clientName, 
      email,
      password,
      location, 
      phone, 
      subscriptionPlan,
      socialTokens 
    } = req.body;
    
    // Parse socialTokens if it's arriving as a JSON string from FormData
    let parsedSocial = socialTokens;
    if (typeof socialTokens === 'string') {
      try { parsedSocial = JSON.parse(socialTokens); } catch(e) {}
    }

    const logoUrl = req.file ? `/api/uploads/logos/${req.file.filename}` : null;
    
    console.log('CREATE CLIENT BODY:', req.body);

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ error: 'Email already exists' });

    // Ensure we create a custom gym for this user
    const gym = await prisma.gym.create({
      data: {
        name: clientName,
        location: location || '',
        logoUrl: logoUrl
      }
    });

    const hashedPassword = await bcrypt.hash(password || 'defaultPassword123!', 10);
    const safeAvatar = `https://i.pravatar.cc/150?u=${email}`;
    
    // Structure social tokens with enabled status
    const formattedSocial = {};
    const platforms = ['instagram', 'facebook', 'twitter', 'blogger'];
    platforms.forEach(p => {
      const tokenVal = parsedSocial && parsedSocial[p] ? parsedSocial[p] : '';
      formattedSocial[p] = {
        token: tokenVal,
        enabled: tokenVal ? true : false
      };
    });

    const user = await prisma.user.create({
      data: {
        name: clientName,
        email,
        password: hashedPassword,
        avatar: safeAvatar,
        role: 'GYM_OWNER',
        gymId: gym.id,
        phone,
        subscriptionPlan: subscriptionPlan || 'Premium',
        subscriptionStatus: 'Active'
      }
    });

    // Update gym with social tokens
    await prisma.gym.update({
      where: { id: gym.id },
      data: { socialTokens: formattedSocial }
    });

    res.status(201).json({ message: 'Client created successfully', client: { ...user, password: undefined, gym } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.patch('/api/supaadmin/clients/:id/social-toggle', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { platform, enabled } = req.body;
    const user = await prisma.user.findUnique({ 
      where: { id: req.params.id },
      include: { gym: true }
    });
    if (!user || !user.gym) return res.status(404).json({ error: 'Client or associated gym not found' });

    const social = user.gym.socialTokens || {};
    if (social[platform]) {
      social[platform].enabled = enabled;
    } else {
      social[platform] = { token: '', enabled: enabled };
    }

    await prisma.gym.update({
      where: { id: user.gymId },
      data: { socialTokens: social }
    });

    res.json({ message: `${platform} toggled ${enabled ? 'on' : 'off'}` });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.patch('/api/supaadmin/clients/:id/password', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await prisma.user.update({
      where: { id: req.params.id },
      data: { password: hashedPassword }
    });

    const target = await prisma.user.findUnique({ where: { id: userId } });
    await writeLog('INFO', 'PASSWORD_RESET', `SuperAdmin reset password for user: ${target.name}`, target.gymId, req.user.id);
    res.json({ message: 'Password updated successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.patch('/api/supaadmin/clients/:id', authenticateToken, requireSuperAdmin, upload.single('logo'), async (req, res) => {
  try {
    const { name, email, phone, subscriptionPlan, subscriptionStatus, businessName, gymLocation, socialTokens } = req.body;
    
    let parsedSocial = socialTokens;
    if (typeof socialTokens === 'string') {
      try { parsedSocial = JSON.parse(socialTokens); } catch(e) {}
    }

    const logoUrl = req.file ? `/api/uploads/logos/${req.file.filename}` : undefined;

    // Update user fields
    const updatedUser = await prisma.user.update({
      where: { id: req.params.id },
      data: {
        ...(name && { name }),
        ...(email && { email }),
        ...(phone !== undefined && { phone }),
        ...(subscriptionPlan && { subscriptionPlan }),
        ...(subscriptionStatus && { subscriptionStatus })
      }
    });

    // Update gym fields if provided
    if (existingUser.gymId) {
      const gym = await prisma.gym.findUnique({ where: { id: existingUser.gymId } });
      let updatedSocial = gym?.socialTokens || {};
      
      if (parsedSocial) {
        const platforms = ['instagram', 'facebook', 'twitter', 'blogger'];
        platforms.forEach(p => {
          const newToken = parsedSocial[p] !== undefined ? parsedSocial[p] : (updatedSocial[p]?.token || '');
          updatedSocial[p] = {
            token: newToken,
            enabled: newToken ? (updatedSocial[p]?.enabled ?? true) : false
          };
        });
      }

      await prisma.gym.update({
        where: { id: existingUser.gymId },
        data: { 
          ...(businessName && { name: businessName }),
          ...(gymLocation !== undefined && { location: gymLocation }),
          ...(logoUrl !== undefined && { logoUrl: logoUrl }),
          socialTokens: updatedSocial
        }
      });
    }

    res.json({ message: 'Client updated successfully', client: { ...updatedUser, password: undefined } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/supaadmin/clients/:id', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) return res.status(404).json({ error: 'Client not found' });

    // Delete user first (FK constraint), then the gym
    const gymId = user.gymId;
    await prisma.user.delete({ where: { id: req.params.id } });
    if (gymId) {
      await prisma.gym.delete({ where: { id: gymId } }).catch(() => {}); // gym may have other deps
    }

    res.json({ message: 'Client deleted successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/gyms/public/:gymId', async (req, res) => {
  try {
    const gym = await prisma.gym.findUnique({
      where: { id: req.params.gymId },
      select: { name: true, logoUrl: true }
    });
    if (!gym) return res.status(404).json({ error: 'Gym not found' });
    res.json(gym);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/supaadmin/pricing', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const pricing = await prisma.pricingConfig.findMany();
    res.json(pricing);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/supaadmin/pricing/:plan', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { plan } = req.params;
    const { priceINR } = req.body;
    const pricing = await prisma.pricingConfig.update({
      where: { plan },
      data: { priceINR: parseFloat(priceINR) }
    });
    
    await writeLog('INFO', 'PLAN_PRICE_UPDATED', `Updated pricing for ${plan} to ₹${priceINR}`, null, req.user.id, { plan, priceINR });
    res.json(pricing);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/supaadmin/revenue', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const clients = await prisma.user.findMany({
      where: { 
        role: 'GYM_OWNER',
        subscriptionStatus: 'Active'
      },
      select: { subscriptionPlan: true, createdAt: true }
    });

    const prices = await prisma.pricingConfig.findMany();
    const priceMap = {};
    prices.forEach(p => { priceMap[p.plan] = p.priceINR; });

    let mrr = 0;
    const planBreakdown = {
      Basic: { count: 0, revenue: 0 },
      Premium: { count: 0, revenue: 0 },
      Enterprise: { count: 0, revenue: 0 }
    };

    clients.forEach(c => {
      const plan = c.subscriptionPlan || 'Basic';
      const price = priceMap[plan] || 0;
      mrr += price;
      if (planBreakdown[plan]) {
        planBreakdown[plan].count++;
        planBreakdown[plan].revenue += price;
      }
    });

    // Generate trajectory data (last 6 months)
    const trajectory = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthLabel = date.toLocaleString('default', { month: 'short' });
      
      // Calculate MRR for that month (simplified: based on clients created then or before)
      let monthMrr = 0;
      clients.forEach(c => {
        if (new Date(c.createdAt) <= date) {
          monthMrr += priceMap[c.subscriptionPlan || 'Basic'] || 0;
        }
      });
      trajectory.push({ name: monthLabel, revenue: monthMrr });
    }

    res.json({
      mrr,
      arr: mrr * 12,
      activeClients: clients.length,
      avgRevenuePerClient: clients.length > 0 ? mrr / clients.length : 0,
      planBreakdown,
      trajectory,
      topPlan: Object.keys(planBreakdown).reduce((a, b) => planBreakdown[a].revenue > planBreakdown[b].revenue ? a : b)
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- LOGS API ---

app.get('/api/supaadmin/logs', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { level, gymId, search, page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (level && level !== 'ALL') where.level = level;
    if (gymId) where.gymId = gymId;
    if (search) {
      where.OR = [
        { message: { contains: search, mode: 'insensitive' } },
        { action: { contains: search, mode: 'insensitive' } },
        { gymId: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [logs, total] = await Promise.all([
      prisma.systemLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.systemLog.count({ where })
    ]);

    res.json({ logs, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/supaadmin/log-stats', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalToday, errorsToday, warningsToday, uniqueGyms] = await Promise.all([
      prisma.systemLog.count({ where: { createdAt: { gte: today } } }),
      prisma.systemLog.count({ where: { level: 'ERROR', createdAt: { gte: today } } }),
      prisma.systemLog.count({ where: { level: 'WARN', createdAt: { gte: today } } }),
      prisma.systemLog.groupBy({
        by: ['gymId'],
        where: { createdAt: { gte: today }, gymId: { not: null } }
      })
    ]);

    res.json({
      totalToday,
      errorsToday,
      warningsToday,
      activeGymsToday: uniqueGyms.length
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/supaadmin/logs/cleanup', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const deleted = await prisma.systemLog.deleteMany({
      where: { createdAt: { lt: ninetyDaysAgo } }
    });

    await writeLog('INFO', 'LOGS_CLEANUP', `Cleaned up ${deleted.count} logs older than 90 days`);
    res.json({ message: `Deleted ${deleted.count} logs`, count: deleted.count });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- SCHEDULED POSTS API (SupaAdmin) ---

app.get('/api/supaadmin/posts', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { gymId, status, platform, page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (gymId) where.gymId = gymId;
    if (status) where.status = status;
    if (platform) {
      // Postgres JSON array contains check
      where.platforms = { array_contains: platform };
    }

    const [posts, total] = await Promise.all([
      prisma.scheduledPost.findMany({
        where,
        include: { gym: { select: { name: true } } },
        orderBy: { scheduledAt: 'asc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.scheduledPost.count({ where })
    ]);

    res.json({ posts, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/supaadmin/posts/:gymId/media', authenticateToken, requireSuperAdmin, uploadPost.single('media'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const mediaUrl = `/api/uploads/posts/${req.params.gymId}/${req.file.filename}`;
    res.json({ mediaUrl, fileName: req.file.filename, mediaType: req.file.mimetype.split('/')[1] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/supaadmin/posts', authenticateToken, requireSuperAdmin, uploadPost.single('media'), async (req, res) => {
  try {
    const data = { ...req.body };
    if (typeof data.platforms === 'string') {
      data.platforms = JSON.parse(data.platforms || '[]');
    } else if (!data.platforms) {
      data.platforms = [];
    }
    
    if (!data.title) data.title = 'Untitled Post';
    
    data.status = data.scheduledAt ? 'SCHEDULED' : 'DRAFT';
    if (data.scheduledAt) data.scheduledAt = new Date(data.scheduledAt);

    if (req.file) {
      data.mediaUrl = `/api/uploads/posts/${data.gymId}/${req.file.filename}`;
      data.fileName = req.file.filename;
      data.mediaType = req.file.mimetype.split('/')[0]; // 'image' or 'video'
    }
    
    const post = await prisma.scheduledPost.create({ data });
    
    await writeLog('INFO', data.status === 'SCHEDULED' ? 'POST_SCHEDULED' : 'POST_CREATED', `Post "${post.title}" created`, post.gymId, req.user.id, { postId: post.id });
    res.json(post);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.patch('/api/supaadmin/posts/:id', authenticateToken, requireSuperAdmin, uploadPost.single('media'), async (req, res) => {
  try {
    const data = { ...req.body };
    if (typeof data.platforms === 'string') {
      data.platforms = JSON.parse(data.platforms || '[]');
    }
    if (data.scheduledAt) data.scheduledAt = new Date(data.scheduledAt);
    if (data.scheduledAt && data.status === 'DRAFT') data.status = 'SCHEDULED';

    if (req.file) {
      data.mediaUrl = `/api/uploads/posts/${data.gymId}/${req.file.filename}`;
      data.fileName = req.file.filename;
      data.mediaType = req.file.mimetype.split('/')[0];
    }

    const post = await prisma.scheduledPost.update({ where: { id: req.params.id }, data });
    await writeLog('INFO', 'POST_UPDATED', `Post "${post.title}" updated`, post.gymId, req.user.id, { postId: post.id });
    res.json(post);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/supaadmin/posts/:id', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const post = await prisma.scheduledPost.delete({ where: { id: req.params.id } });
    await writeLog('WARN', 'POST_DELETED', `Post "${post.title}" deleted`, post.gymId, req.user.id, { postId: post.id });
    res.json({ message: 'Post deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.patch('/api/supaadmin/posts/:id/cancel', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const post = await prisma.scheduledPost.update({
      where: { id: req.params.id },
      data: { status: 'CANCELLED' }
    });
    await writeLog('WARN', 'POST_CANCELLED', `Post "${post.title}" cancelled`, post.gymId, req.user.id, { postId: post.id });
    res.json(post);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.patch('/api/supaadmin/posts/:id/retry', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const post = await prisma.scheduledPost.update({
      where: { id: req.params.id },
      data: { status: 'SCHEDULED', errorLog: null }
    });
    await writeLog('INFO', 'POST_SCHEDULED', `Post "${post.title}" retried`, post.gymId, req.user.id, { postId: post.id });
    res.json(post);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- N8N INTEGRATION API ---

const requireN8nAuth = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || apiKey !== process.env.N8N_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized n8n access' });
  }
  next();
};

app.get('/api/n8n/pending-posts', requireN8nAuth, async (req, res) => {
  try {
    const posts = await prisma.scheduledPost.findMany({
      where: {
        status: 'SCHEDULED',
        scheduledAt: { lte: new Date() }
      },
      include: {
        gym: {
          select: { socialTokens: true }
        }
      }
    });

    // Format for n8n: extract tokens cleanly
    const formattedPosts = posts.map(post => {
      return {
        ...post,
        socialTokens: post.gym?.socialTokens || {}
      };
    });

    res.json(formattedPosts);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.patch('/api/n8n/posts/:id/result', requireN8nAuth, async (req, res) => {
  try {
    const { status, error } = req.body;
    
    const post = await prisma.scheduledPost.update({
      where: { id: req.params.id },
      data: { 
        status, 
        errorLog: error || null,
        publishedAt: status === 'PUBLISHED' ? new Date() : null
      }
    });

    if (status === 'PUBLISHED') {
      await writeLog('INFO', 'POST_PUBLISHED', `Post "${post.title}" published successfully`, post.gymId, null, { postId: post.id });
      
      // Handle recurring logic
      if (post.recurring && post.recurring !== 'none') {
        const nextDate = new Date(post.scheduledAt);
        if (post.recurring === 'weekly') nextDate.setDate(nextDate.getDate() + 7);
        if (post.recurring === 'monthly') nextDate.setMonth(nextDate.getMonth() + 1);

        const newPost = await prisma.scheduledPost.create({
          data: {
            gymId: post.gymId,
            title: post.title,
            caption: post.caption,
            hashtags: post.hashtags,
            platforms: post.platforms,
            mediaUrl: post.mediaUrl,
            mediaType: post.mediaType,
            fileName: post.fileName,
            scheduledAt: nextDate,
            status: 'SCHEDULED',
            recurring: post.recurring,
            parentId: post.id
          }
        });
        await writeLog('INFO', 'POST_RECURRING_QUEUED', `Recurring post "${newPost.title}" scheduled for ${nextDate.toISOString()}`, post.gymId, null, { postId: newPost.id });
      }
    } else {
      await writeLog('ERROR', 'POST_FAILED', `Post "${post.title}" failed to publish`, post.gymId, null, { postId: post.id, error });
    }

    res.json(post);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/admin/announce', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { title, body } = req.body;
    const payload = JSON.stringify({ title, body });
    // Push notifications currently stubbed due to platform migration limits
    console.log(`[STUB] Push Announcement: ${title} - ${body}`);
    res.status(200).json({ message: `Announcement drafted.` });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- Push Notifications ---
app.get('/api/notifications/key', (req, res) => {
  res.json({ publicKey: vapidKeys.publicKey });
});

app.post('/api/notifications/subscribe', authenticateToken, async (req, res) => {
  try {
    const subscription = req.body;
    // Database push subscription saving stubbed until Push Schema is added to Prisma
    
    // Send a welcome notification immediately
    const payload = JSON.stringify({
      title: 'Welcome to GymCore V11!',
      body: 'You have successfully subscribed to Push Notifications.'
    });

    webpush.sendNotification(subscription, payload).catch(err => console.error(err));
    res.status(201).json({ message: 'Subscribed successfully (Local Only)' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- Workout/Nutrition Routes ---
app.get('/api/workouts', authenticateToken, async (req, res) => {
  try {
    const workouts = await prisma.workout.findMany({ 
      where: { userId: req.user.id },
      orderBy: { date: 'desc' }
    });
    res.json(workouts);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/workouts', authenticateToken, async (req, res) => {
  try {
    const workout = await prisma.workout.create({
      data: {
        userId: req.user.id,
        type: req.body.type,
        duration: req.body.duration,
        calories: req.body.calories
      }
    });
    await updatePoints(req.user.id, 10);
    res.json({ id: workout.id, message: 'Workout logged! +10 Points' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/nutrition', authenticateToken, async (req, res) => {
  try {
    const nutrition = await prisma.nutrition.findMany({
      where: { userId: req.user.id },
      orderBy: { date: 'desc' }
    });
    res.json(nutrition);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/nutrition', authenticateToken, async (req, res) => {
  try {
    const entry = await prisma.nutrition.create({
      data: {
        userId: req.user.id,
        meal: req.body.meal,
        calories: req.body.calories,
        protein: req.body.protein,
        carbs: req.body.carbs,
        fat: req.body.fat
      }
    });
    await updatePoints(req.user.id, 5);
    res.json({ id: entry.id, message: 'Nutrition logged! +5 Points' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- Community/Post Routes ---
app.get('/api/community/posts', authenticateToken, async (req, res) => {
  try {
    // Get user to check their gymId
    const currentUser = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!currentUser) return res.status(404).json({ error: 'User not found' });

    const posts = await prisma.post.findMany({
      where: {
        user: { gymId: currentUser.gymId }
      },
      include: { user: { select: { name: true, avatar: true } } },
      orderBy: { createdAt: 'desc' }
    });
    
    // Map to frontend expected format
    const formatted = posts.map(p => ({
      ...p, _id: p.id,
      user_name: p.user.name, user_avatar: p.user.avatar,
      likedBy: [], comments: [] // Stubbed arrays
    }));
    
    res.json(formatted);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/community/posts', authenticateToken, async (req, res) => {
  try {
    const post = await prisma.post.create({
      data: {
        userId: req.user.id,
        content: req.body.content
      }
    });
    res.json({ id: post.id, message: 'Post created!' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/community/posts/:id/like', authenticateToken, async (req, res) => {
  try {
    const post = await prisma.post.update({
      where: { id: req.params.id },
      data: { likes: { increment: 1 } }
    });
    // Stub out likedBy for MVP Prisma transition
    res.json({ likes: post.likes, likedBy: [] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/community/posts/:id/comment', authenticateToken, async (req, res) => {
  try {
    // Comments stubbed in Prisma schema, just return mock
    res.json({ content: req.body.content, user_name: 'You' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/community/posts/:id', authenticateToken, async (req, res) => {
  try {
    const post = await prisma.post.findUnique({ where: { id: req.params.id } });
    if (!post) return res.status(404).json({ error: 'Post not found' });
    
    const currentUser = await prisma.user.findUnique({ 
      where: { id: req.user.id },
      select: { id: true, role: true, gymId: true }
    });
    if (post.userId !== req.user.id && currentUser.role !== 'SUPER_ADMIN' && currentUser.role !== 'GYM_OWNER') {
      return res.status(403).json({ error: 'Unauthorized to delete this post' });
    }
    
    await prisma.post.delete({ where: { id: req.params.id } });
    res.json({ message: 'Post deleted successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- Shop / Inventory Routes ---
app.get('/api/products', authenticateToken, async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      orderBy: [
        { category: 'asc' },
        { name: 'asc' }
      ]
    });
    // Ensure frontend gets _id back
    const formatted = products.map(p => ({ ...p, _id: p.id }));
    res.json(formatted);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/products', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const product = await prisma.product.create({
      data: {
        gymId: req.fullUser.gymId,
        name: req.body.name,
        description: req.body.description,
        price: parseFloat(req.body.price),
        category: req.body.category,
        image: req.body.image
      }
    });
    res.status(201).json({ ...product, _id: product.id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/products/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Only current gym owner can delete their products
    const prod = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!prod || prod.gymId !== req.fullUser.gymId) return res.status(403).json({ error: 'Unauthorized' });

    await prisma.product.delete({ where: { id: req.params.id } });
    res.json({ message: 'Product deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/leaderboard', authenticateToken, async (req, res) => {
  try {
    // Get user to check their gymId
    const currentUser = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!currentUser) return res.status(404).json({ error: 'User not found' });

    const topUsers = await prisma.user.findMany({
      where: { 
        gymId: currentUser.gymId,
        role: 'GYM_MEMBER' 
      },
      orderBy: { points: 'desc' },
      take: 10,
      select: { id: true, name: true, avatar: true, points: true }
    });
    
    res.json(topUsers);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.use(express.static(path.join(__dirname, '../client/dist')));
app.use((req, res, next) => {
  if (req.method !== 'GET') return next();
  // If request is for an API or an asset that was not found by express.static, don't return index.html
  if (req.path.startsWith('/api') || req.path.includes('.')) {
    return res.status(404).json({ error: 'Not Found' });
  }
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log('\n✅ Server connected! API ready on port', PORT));
