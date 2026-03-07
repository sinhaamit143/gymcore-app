const db = require('./db');
const bcrypt = require('bcryptjs');

const seedData = async () => {
  console.log('Seeding data...');

  // Helper to run query
  const runQuery = (query, params = []) => new Promise((resolve, reject) => {
      db.run(query, params, function(err) {
          if (err) reject(err);
          else resolve(this);
      });
  });

  try {
      // Clear existing tables
      await runQuery(`DELETE FROM workouts`);
      await runQuery(`DELETE FROM nutrition`);
      await runQuery(`DELETE FROM posts`);
      await runQuery(`DELETE FROM services`);
      await runQuery(`DELETE FROM users`);
      await runQuery(`DELETE FROM sqlite_sequence`); // Reset auto-increments

      // Seed Users
      const password = bcrypt.hashSync('password123', 8);
      const today = new Date().toISOString().split('T')[0];

      await runQuery(`INSERT INTO users (id, name, email, password, avatar, points) VALUES (?, ?, ?, ?, ?, ?)`, 
          [1, 'John Doe', 'john@example.com', password, 'https://i.pravatar.cc/150?u=john', 1250]);
      await runQuery(`INSERT INTO users (id, name, email, password, avatar, points) VALUES (?, ?, ?, ?, ?, ?)`, 
          [2, 'Jane Smith', 'jane@example.com', password, 'https://i.pravatar.cc/150?u=jane', 2100]);
      await runQuery(`INSERT INTO users (id, name, email, password, avatar, points) VALUES (?, ?, ?, ?, ?, ?)`, 
          [3, 'Mike Johnson', 'mike@example.com', password, 'https://i.pravatar.cc/150?u=mike', 850]);

      // Seed Workouts for John Doe
      await runQuery(`INSERT INTO workouts (user_id, date, type, duration, calories) VALUES (?, ?, ?, ?, ?)`, 
          [1, today, 'Strength Training', 45, 320]);
      await runQuery(`INSERT INTO workouts (user_id, date, type, duration, calories) VALUES (?, ?, ?, ?, ?)`, 
          [1, '2023-10-25', 'HIIT Cardio', 30, 450]);

      // Seed Nutrition for John Doe
      await runQuery(`INSERT INTO nutrition (user_id, date, meal, calories, protein, carbs, fat) VALUES (?, ?, ?, ?, ?, ?, ?)`, 
          [1, today, 'Breakfast (Oatmeal & Eggs)', 450, 25, 50, 15]);
      await runQuery(`INSERT INTO nutrition (user_id, date, meal, calories, protein, carbs, fat) VALUES (?, ?, ?, ?, ?, ?, ?)`, 
          [1, today, 'Lunch (Chicken Salad)', 600, 45, 20, 25]);

      // Seed Posts
      await runQuery(`INSERT INTO posts (user_id, content, timestamp, likes) VALUES (?, ?, ?, ?)`, 
          [2, 'Just hit a new PR on deadlifts! 225lbs 💪', new Date(Date.now() - 3600000).toISOString(), 12]);
      await runQuery(`INSERT INTO posts (user_id, content, timestamp, likes) VALUES (?, ?, ?, ?)`, 
          [3, 'Anyone up for a running buddy challenge this weekend?', new Date(Date.now() - 86400000).toISOString(), 5]);

      // Seed Services
      await runQuery(`INSERT INTO services (title, description, price, image) VALUES (?, ?, ?, ?)`, 
          ['1-on-1 Personal Training', 'Get a dedicated coach to accelerate your progress with customized workout plans and form correction.', 49.99, 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80']);
      await runQuery(`INSERT INTO services (title, description, price, image) VALUES (?, ?, ?, ?)`, 
          ['Custom Nutrition Plan', 'A 4-week meal plan tailored to your body type, allergies, and specific fitness goals.', 29.99, 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80']);
      await runQuery(`INSERT INTO services (title, description, price, image) VALUES (?, ?, ?, ?)`, 
          ['Premium Supplements Stack', 'Our top-tier whey protein and pre-workout bundle for maximum recovery.', 89.99, 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80']);

      console.log('Database seeded successfully!');
  } catch (err) {
      console.error('Seeding error:', err);
  } finally {
      db.close();
  }
};

setTimeout(() => {
    seedData();
}, 1000); // Give db a moment to initialize schema
