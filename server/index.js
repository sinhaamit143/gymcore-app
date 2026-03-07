require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const path = require('path');

const User = require('./models/User');
const Workout = require('./models/Workout');
const Nutrition = require('./models/Nutrition');
const Post = require('./models/Post');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const JWT_SECRET = process.env.JWT_SECRET || 'gym_app_secret_key_123';
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/gymcore';

mongoose.connect(MONGO_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

mongoose.set('toJSON', {
  virtuals: true,
  transform: (doc, converted) => {
    delete converted._id;
    delete converted.__v;
  }
});

app.use(express.static(path.join(__dirname, '../client/dist')));

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
    res.json(user);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/user', authenticateToken, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user.id, req.body);
    res.json({ message: 'Profile updated' });
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
      content: req.body.content
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

// --- Leaderboard & Services ---
app.get('/api/leaderboard', authenticateToken, async (req, res) => {
  try {
    const topUsers = await User.find()
      .sort({ points: -1 })
      .limit(10)
      .select('name avatar points');
    
    res.json(topUsers);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/services', authenticateToken, (req, res) => {
  res.json([
    { id: 1, title: '1-on-1 Personal Training', description: 'Get a dedicated coach to accelerate your progress with customized workout plans and form correction.', price: 49.99, image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80' },
    { id: 2, title: 'Custom Nutrition Plan', description: 'A 4-week meal plan tailored to your body type, allergies, and specific fitness goals.', price: 29.99, image: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80' },
    { id: 3, title: 'Premium Supplements Stack', description: 'Our top-tier whey protein and pre-workout bundle for maximum recovery.', price: 89.99, image: 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80' }
  ]);
});

app.use((req, res) => res.sendFile(path.join(__dirname, '../client/dist/index.html')));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log('\n✅ Server connected! API ready on port', PORT));
