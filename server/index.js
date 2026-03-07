const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = 'gym_app_secret_key_123';
const DB_FILE = path.join(__dirname, 'db.json');

// Serve static files from the React app
app.use(express.static(path.join(__dirname, '../client/dist')));

let db = {
  users: [
    { id: 1, name: 'John Doe', email: 'john@example.com', password: 'password123', avatar: 'https://i.pravatar.cc/150?u=john', points: 1250 },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', password: 'password123', avatar: 'https://i.pravatar.cc/150?u=jane', points: 2100 },
    { id: 3, name: 'Mike Johnson', email: 'mike@example.com', password: 'password123', avatar: 'https://i.pravatar.cc/150?u=mike', points: 850 }
  ],
  workouts: [
    { id: 1, user_id: 1, date: new Date().toISOString().split('T')[0], type: 'Strength Training', duration: 45, calories: 320 },
    { id: 2, user_id: 1, date: '2023-10-25', type: 'HIIT Cardio', duration: 30, calories: 450 }
  ],
  nutrition: [
    { id: 1, user_id: 1, date: new Date().toISOString().split('T')[0], meal: 'Breakfast (Oatmeal & Eggs)', calories: 450, protein: 25, carbs: 50, fat: 15 },
    { id: 2, user_id: 1, date: new Date().toISOString().split('T')[0], meal: 'Lunch (Chicken Salad)', calories: 600, protein: 45, carbs: 20, fat: 25 }
  ],
  posts: [
    { id: 1, user_id: 2, content: 'Just hit a new PR on deadlifts! 225lbs 💪', timestamp: new Date(Date.now() - 3600000).toISOString(), likes: 12 },
    { id: 2, user_id: 3, content: 'Anyone up for a running buddy challenge this weekend?', timestamp: new Date(Date.now() - 86400000).toISOString(), likes: 5 }
  ],
  services: [
    { id: 1, title: '1-on-1 Personal Training', description: 'Get a dedicated coach to accelerate your progress with customized workout plans and form correction.', price: 49.99, image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80' },
    { id: 2, title: 'Custom Nutrition Plan', description: 'A 4-week meal plan tailored to your body type, allergies, and specific fitness goals.', price: 29.99, image: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80' },
    { id: 3, title: 'Premium Supplements Stack', description: 'Our top-tier whey protein and pre-workout bundle for maximum recovery.', price: 89.99, image: 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80' }
  ]
};

// Load DB from file if exists
if (fs.existsSync(DB_FILE)) {
  db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
} else {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

const saveDb = () => fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));

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

app.post('/api/auth/register', (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'All fields are required' });
  if (db.users.find(u => u.email === email)) return res.status(400).json({ error: 'Email already exists' });

  const newUser = { id: db.users.length + 1, name, email, password, avatar: 'https://i.pravatar.cc/150?u=' + email, points: 0 };
  db.users.push(newUser);
  saveDb();

  const token = jwt.sign({ id: newUser.id, email }, JWT_SECRET, { expiresIn: '24h' });
  const { password: _, ...userWithoutPassword } = newUser;
  res.json({ token, user: userWithoutPassword });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = db.users.find(u => u.email === email);
  if (!user || user.password !== password) return res.status(401).json({ error: 'Invalid credentials' });

  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });
  const { password: _, ...userWithoutPassword } = user;
  res.json({ token, user: userWithoutPassword });
});

app.get('/api/user', authenticateToken, (req, res) => {
  const user = db.users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const { password, ...userWithoutPassword } = user;
  res.json(userWithoutPassword);
});

app.put('/api/user', authenticateToken, (req, res) => {
  const userIndex = db.users.findIndex(u => u.id === req.user.id);
  if (userIndex === -1) return res.status(404).json({ error: 'User not found' });
  db.users[userIndex] = { ...db.users[userIndex], ...req.body };
  saveDb();
  res.json({ message: 'Profile updated' });
});

app.get('/api/workouts', authenticateToken, (req, res) => {
  const workouts = db.workouts.filter(w => w.user_id === req.user.id).sort((a, b) => new Date(b.date) - new Date(a.date));
  res.json(workouts);
});

app.post('/api/workouts', authenticateToken, (req, res) => {
  const workout = { id: db.workouts.length + 1, user_id: req.user.id, ...req.body };
  db.workouts.push(workout);
  const user = db.users.find(u => u.id === req.user.id);
  if (user) user.points += 10;
  saveDb();
  res.json({ id: workout.id, message: 'Workout logged! +10 Points' });
});

app.get('/api/nutrition', authenticateToken, (req, res) => {
  const nutrition = db.nutrition.filter(n => n.user_id === req.user.id).sort((a, b) => new Date(b.date) - new Date(a.date));
  res.json(nutrition);
});

app.post('/api/nutrition', authenticateToken, (req, res) => {
  const entry = { id: db.nutrition.length + 1, user_id: req.user.id, ...req.body };
  db.nutrition.push(entry);
  saveDb();
  res.json({ id: entry.id, message: 'Nutrition logged successfully!' });
});

app.get('/api/community/posts', authenticateToken, (req, res) => {
  const posts = db.posts.map(p => {
    const user = db.users.find(u => u.id === p.user_id);
    return { ...p, name: user?.name, avatar: user?.avatar };
  }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  res.json(posts);
});

app.post('/api/community/posts', authenticateToken, (req, res) => {
  const post = { id: db.posts.length + 1, user_id: req.user.id, content: req.body.content, timestamp: new Date().toISOString(), likes: 0 };
  db.posts.push(post);
  saveDb();
  res.json({ id: post.id, message: 'Post created!' });
});

app.get('/api/leaderboard', authenticateToken, (req, res) => {
  const topUsers = [...db.users].sort((a, b) => b.points - a.points).slice(0, 10).map(u => ({ id: u.id, name: u.name, avatar: u.avatar, points: u.points }));
  res.json(topUsers);
});

app.get('/api/services', authenticateToken, (req, res) => {
  res.json(db.services);
});

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.use((req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => console.log(`Mock JSON Backend running on port ${PORT}`));
