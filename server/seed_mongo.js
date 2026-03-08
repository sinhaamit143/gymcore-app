require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Workout = require('./models/Workout');
const Nutrition = require('./models/Nutrition');
const Post = require('./models/Post');

const MONGO_URI = 'mongodb+srv://admin:admin@cluster0.abrf7et.mongodb.net/?appName=Cluster0';

const seedData = async () => {
  console.log('Connecting to MongoDB...');
  
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected! Clearing existing data...');

    await User.deleteMany({});
    await Workout.deleteMany({});
    await Nutrition.deleteMany({});
    await Post.deleteMany({});

    console.log('Seeding original Mock DB to MongoDB Atlas...');

    const password = await bcrypt.hash('password123', 10);
    const today = new Date().toISOString().split('T')[0];

    // --- Users ---
    const user1 = new User({ 
      name: 'John Doe', email: 'john@example.com', password, 
      avatar: 'https://i.pravatar.cc/150?u=john', points: 1250, 
      currentWeight: 185, targetWeight: 175, age: 28, phone: '+1 555-0192', 
      bio: 'Fitness enthusiast. Looking to get stronger!', purchasedServices: [1] 
    });
    
    const user2 = new User({ 
      name: 'Jane Smith', email: 'jane@example.com', password, 
      avatar: 'https://i.pravatar.cc/150?u=jane', points: 2100, 
      currentWeight: 140, targetWeight: 135, age: 31, 
      bio: 'Running is my therapy.'
    });

    const user3 = new User({ 
      name: 'Mike Johnson', email: 'mike@example.com', password, 
      avatar: 'https://i.pravatar.cc/150?u=mike', points: 850, 
      currentWeight: 210, targetWeight: 195, age: 25, 
      purchasedServices: [3] 
    });

    await Promise.all([user1.save(), user2.save(), user3.save()]);

    // --- Workouts ---
    const w1 = new Workout({ user_id: user1._id, date: today, type: 'Strength Training', duration: 45, calories: 320 });
    const w2 = new Workout({ user_id: user1._id, date: '2023-10-25', type: 'HIIT Cardio', duration: 30, calories: 450 });
    
    await Promise.all([w1.save(), w2.save()]);

    // --- Nutrition ---
    const n1 = new Nutrition({ user_id: user1._id, date: today, meal: 'Breakfast (Oatmeal & Eggs)', calories: 450, protein: 25, carbs: 50, fat: 15 });
    const n2 = new Nutrition({ user_id: user1._id, date: today, meal: 'Lunch (Chicken Salad)', calories: 600, protein: 45, carbs: 20, fat: 25 });
    
    await Promise.all([n1.save(), n2.save()]);

    // --- Posts ---
    const p1 = new Post({ 
      user_id: user2._id, user_name: user2.name, user_avatar: user2.avatar, 
      content: 'Just hit a new PR on deadlifts! 225lbs 💪', 
      likes: 12, 
      comments: [{ user_id: user3._id, user_name: user3.name, user_avatar: user3.avatar, content: 'Awesome job!' }] 
    });
    
    const p2 = new Post({ 
      user_id: user3._id, user_name: user3.name, user_avatar: user3.avatar, 
      content: 'Anyone up for a running buddy challenge this weekend?', likes: 5 
    });

    await Promise.all([p1.save(), p2.save()]);

    console.log('✅ MongoDB Seeding Complete!');
    process.exit(0);
    
  } catch (err) {
    console.error('Seeding Error:', err);
    process.exit(1);
  }
};

seedData();
