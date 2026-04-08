require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const path = require('path');
const webpush = require('web-push');

const User = require('./models/User');
const Workout = require('./models/Workout');
const Nutrition = require('./models/Nutrition');
const Post = require('./models/Post');
const AssignedPlan = require('./models/AssignedPlan');
const Product = require('./models/Product');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

const JWT_SECRET = process.env.JWT_SECRET || 'gym_app_secret_key_123';
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/gymcore';

/* --- Web Push VAPID Keys --- */
// Normally you'd keep these in .env. We'll generate them once on server start for prototype.
const vapidKeys = webpush.generateVAPIDKeys();
webpush.setVapidDetails(
  'mailto:test@example.com',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB safely!');
    seedDatabase();
    cleanupStaleData();
  })
  .catch(err => console.log('MongoDB Hook Error:', err));

const cleanupStaleData = async () => {
  try {
    const users = await User.find({ avatar: { $exists: true } });
    let count = 0;
    for (let u of users) {
      if (u.avatar && u.avatar.length > 500000) { // > 500KB
         u.avatar = 'https://i.pravatar.cc/150?u=' + u.email;
         await u.save();
         count++;
      }
    }
    if (count > 0) console.log(`🧹 Data Cleanup: Truncated ${count} massive avatar strings.`);
  } catch (err) { console.error('Cleanup Error:', err); }
};

const seedDatabase = async () => {
  try {
    const adminExists = await User.findOne({ email: 'admin@gymcore.com' });
    if (adminExists) {
      if (adminExists.role !== 'admin') {
        adminExists.role = 'admin';
        await adminExists.save();
        console.log('✅ Updated existing admin@gymcore.com to have Admin privileges!');
      }
      return;
    }

    console.log('🌱 Admin missing. Seeding admin and test records...');

    const adminHash = await bcrypt.hash('admin123', 10);
    const adminUser = new User({
      name: 'GymCore Admin',
      email: 'admin@gymcore.com',
      password: adminHash,
      role: 'admin',
      avatar: 'https://i.pravatar.cc/150?u=admin@gymcore.com'
    });
    await adminUser.save();

    const userHash = await bcrypt.hash('password123', 10);
    const testUser = new User({
      name: 'Demo Athlete',
      email: 'user@gymcore.com',
      password: userHash,
      avatar: 'https://i.pravatar.cc/150?u=user@gymcore.com',
      points: 15
    });
    await testUser.save();

    await Workout.create({
      user_id: testUser._id,
      type: 'Push Day (Chest, Shoulders, Triceps)',
      duration: 60,
      calories: 450
    });

    await Nutrition.create({
      user_id: testUser._id,
      meal: 'Grilled Chicken & Quinoa',
      calories: 550,
      protein: 55,
      carbs: 60,
      fat: 10
    });

    await Post.create({
      user_id: testUser._id,
      user_name: testUser.name,
      user_avatar: testUser.avatar,
      content: 'Just started using GymCore! This app is amazing! 💪',
      likes: 12
    });

    console.log('✅ Database successfully seeded! Admin: admin@gymcore.com | Pass: admin123');
  } catch (err) {
    console.error('Seed Error:', err);
  }
};

mongoose.set('toJSON', {
  virtuals: true,
  transform: (doc, converted) => {
    delete converted._id;
    delete converted.__v;
  }
});



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
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  } catch (err) { res.status(500).json({ error: err.message }); }
};

const updatePoints = async (userId, pointsToAdd) => {
  await User.findByIdAndUpdate(userId, { $inc: { points: pointsToAdd } });
};

// --- Auth Routes ---
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'All fields are required' });
    
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: 'Email already exists' });
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ 
      name, email, password: hashedPassword, 
      avatar: 'https://i.pravatar.cc/150?u=' + email 
    });
    await user.save();
    
    const token = jwt.sign({ id: user._id, email }, JWT_SECRET, { expiresIn: '24h' });
    user.password = undefined;
    res.json({ token, user });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });
    
    const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });
    user.password = undefined;
    res.json({ token, user });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- User Routes ---
app.get('/api/user', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    // Safety check for current user as well
    const obj = user.toObject();
    if (obj.avatar && obj.avatar.length > 50000) {
      obj.avatar = `https://i.pravatar.cc/150?u=${obj.email}`;
    }
    res.json(obj);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/user', authenticateToken, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user.id, req.body);
    res.json({ message: 'Profile updated' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/user/subscribe', authenticateToken, async (req, res) => {
  try {
    const { plan } = req.body;
    if (!['free', 'pro', 'elite'].includes(plan)) {
      return res.status(400).json({ error: 'Invalid subscription plan' });
    }
    
    await User.findByIdAndUpdate(req.user.id, { 
      subscriptionPlan: plan,
      subscriptionStatus: 'active'
    });
    
    res.json({ message: `Successfully subscribed to ${plan} plan!` });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/user/plans', authenticateToken, async (req, res) => {
  try {
    const plans = await AssignedPlan.find({ user_id: req.user.id }).sort({ createdAt: -1 });
    res.json(plans);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- Admin Routes ---
app.get('/api/admin/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const users = await User.find().lean().select('-password').sort({ createdAt: -1 });
    console.log(`🔍 Admin fetch: Processing ${users.length} users. V:14.2`);
    
    // EXTREMELY Aggressive safety mapping
    const safeUsers = users.map(u => {
      if (u.avatar && u.avatar.length > 30000) { // 30KB limit
        console.log(`⚠️  TRUNCATED: ${u.email} avatar was ${u.avatar.length} chars.`);
        u.avatar = `https://i.pravatar.cc/150?u=${u.email}`;
      }
      return u;
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
    if (!['user', 'admin'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
    
    await User.findByIdAndUpdate(req.params.id, { role });
    res.json({ message: `User role updated to ${role}` });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/admin/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    await Workout.deleteMany({ user_id: req.params.id });
    await Nutrition.deleteMany({ user_id: req.params.id });
    res.json({ message: 'User deleted successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/admin/users/:id/details', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    const workouts = await Workout.find({ user_id: user._id }).sort({ date: -1 }).limit(10);
    const nutrition = await Nutrition.find({ user_id: user._id }).sort({ date: -1 }).limit(10);
    const plans = await AssignedPlan.find({ user_id: user._id }).sort({ createdAt: -1 });
    res.json({ user, workouts, nutrition, plans });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/admin/assign-plan', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { user_id, type, title, details } = req.body;
    const plan = new AssignedPlan({
      user_id,
      admin_id: req.user.id,
      type,
      title,
      details
    });
    await plan.save();
    res.status(201).json(plan);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/admin/announce', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const payload = JSON.stringify({ title, body });
    
    // Broadcast to all active subscriptions in the database
    const usersWithSubs = await User.find({ pushSubscription: { $exists: true, $ne: null } });
    
    usersWithSubs.forEach(user => {
      webpush.sendNotification(user.pushSubscription, payload).catch(err => console.error('Push failed for user', user.email, err));
    });
    
    res.status(200).json({ message: `Announcement sent to ${usersWithSubs.length} devices.` });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- Push Notifications ---
app.get('/api/notifications/key', (req, res) => {
  res.json({ publicKey: vapidKeys.publicKey });
});

app.post('/api/notifications/subscribe', authenticateToken, async (req, res) => {
  try {
    const subscription = req.body;
    await User.findByIdAndUpdate(req.user.id, { pushSubscription: subscription });
    
    // Send a welcome notification
    const payload = JSON.stringify({
      title: 'Welcome to GymCore V11!',
      body: 'You have successfully subscribed to Push Notifications. Your subscription is now secured in our database.'
    });

    webpush.sendNotification(subscription, payload).catch(err => console.error(err));
    res.status(201).json({ message: 'Subscribed successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- Workout/Nutrition Routes ---
app.get('/api/workouts', authenticateToken, async (req, res) => {
  try {
    const workouts = await Workout.find({ user_id: req.user.id }).sort({ date: -1 });
    res.json(workouts);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/workouts', authenticateToken, async (req, res) => {
  try {
    const workout = new Workout({ user_id: req.user.id, ...req.body });
    await workout.save();
    await updatePoints(req.user.id, 10);
    res.json({ id: workout._id, message: 'Workout logged! +10 Points' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/nutrition', authenticateToken, async (req, res) => {
  try {
    const nutrition = await Nutrition.find({ user_id: req.user.id }).sort({ date: -1 });
    res.json(nutrition);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/nutrition', authenticateToken, async (req, res) => {
  try {
    const entry = new Nutrition({ user_id: req.user.id, ...req.body });
    await entry.save();
    await updatePoints(req.user.id, 5);
    res.json({ id: entry._id, message: 'Nutrition logged! +5 Points' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- Community/Post Routes ---
app.get('/api/community/posts', authenticateToken, async (req, res) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 });
    res.json(posts);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/community/posts', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const post = new Post({
      user_id: user._id,
      user_name: user.name,
      user_avatar: user.avatar,
      content: req.body.content,
      imageUrl: req.body.imageUrl || null
    });
    await post.save();
    res.json({ id: post._id, message: 'Post created!' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/community/posts/:id/like', authenticateToken, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    
    const likedIndex = post.likedBy.indexOf(req.user.id);
    if (likedIndex > -1) {
      post.likedBy.splice(likedIndex, 1);
      post.likes = Math.max(0, post.likes - 1);
    } else {
      post.likedBy.push(req.user.id);
      post.likes += 1;
    }
    await post.save();
    res.json({ likes: post.likes, likedBy: post.likedBy });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/community/posts/:id/comment', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const newComment = {
      user_id: user._id,
      user_name: user.name,
      user_avatar: user.avatar,
      content: req.body.content
    };
    
    const post = await Post.findByIdAndUpdate(
      req.params.id, 
      { $push: { comments: newComment } },
      { new: true }
    );
    res.json(post.comments[post.comments.length - 1]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/community/posts/:id', authenticateToken, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    
    // Check if user is owner or admin
    const user = await User.findById(req.user.id);
    if (post.user_id.toString() !== req.user.id && user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized to delete this post' });
    }
    
    await Post.findByIdAndDelete(req.params.id);
    res.json({ message: 'Post deleted successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- Shop / Inventory Routes ---
app.get('/api/products', authenticateToken, async (req, res) => {
  try {
    const products = await Product.find().sort({ category: 1, name: 1 });
    res.json(products);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/products', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const product = new Product(req.body);
    await product.save();
    res.status(201).json(product);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/products/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: 'Product deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/leaderboard', authenticateToken, async (req, res) => {
  try {
    const topUsers = await User.find()
      .sort({ points: -1 })
      .limit(10)
      .select('name avatar points');
    
    res.json(topUsers);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.use(express.static(path.join(__dirname, '../client/dist')));
app.get('*', (req, res) => {
  // If request is for an API or an asset that was not found by express.static, don't return index.html
  if (req.path.startsWith('/api') || req.path.includes('.')) {
    return res.status(404).json({ error: 'Not Found' });
  }
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log('\n✅ Server connected! API ready on port', PORT));
