const User = require('../models/user.model');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const colors = require('colors');

// Load env vars
dotenv.config();

// Function to seed the database
const seedDatabase = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB'.cyan.underline);

    // Clear existing users
    await User.deleteMany({ email: 'admin@test.com' });
    
    // Create a test admin user
    await User.create({
      fullName: 'Admin User',
      email: 'admin@test.com',
      phone: '09123456789',
      password: 'password123',
      role: 'admin',
      address: 'Test Address',
      postalCode: '1234567890',
      isProfileCompleted: true
    });

    console.log('Test admin user created successfully'.green.inverse);
    console.log('Email: admin@test.com'.cyan);
    console.log('Password: password123'.cyan);
    console.log('Phone: 09123456789'.cyan);

    process.exit(0);
  } catch (error) {
    console.error(`Error: ${error.message}`.red.inverse);
    process.exit(1);
  }
};

// Call the seeder function
seedDatabase(); 