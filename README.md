# Professional Aptitude Test 2024-2025 - Setup Guide

This guide explains how to set up and run the project, including React Native, PHP, and SQL components.

1️⃣ Clone the Repository
----------------------------------------
# Clone the repository to your local machine
git clone https://github.com/DinisFragata292204/DinisFragata292204-Professional-Aptitude-Test-2024-2025.git

# Go into the project folder
cd DinisFragata292204-Professional-Aptitude-Test-2024-2025

2️⃣ React Native Setup
----------------------------------------
# Install npm dependencies
cd react-native/PAP-ReactNative
npm install

# If using Expo, install Expo CLI globally (if not already installed)
npm install -g expo-cli

# Start the Expo development server
expo start

3️⃣ PHP Setup
----------------------------------------
# Go to the PHP folder
cd PHP

# Create a .env file based on the template
cp data.env.example data.env

# Example of variables
# DB_HOST=localhost
# DB_USER=root
# DB_PASS=password
# SENDGRID_API_KEY=your_sendgrid_key

# Install PHP dependencies (if using Composer)
composer install

# Start PHP built-in server
php -S localhost:8000

4️⃣ SQL Setup
----------------------------------------
# Access MySQL or your preferred SQL client
mysql -u root -p

# Create the database
CREATE DATABASE professional_aptitude_test;

# Import the SQL file (assuming the SQL file is at PHP/database.sql)
USE professional_aptitude_test;
SOURCE path/to/PHP/database.sql;

5️⃣ Run the Project
----------------------------------------
# Start the React Native app using expo start
# Start the PHP server using php -S localhost:8000
# Ensure your SQL database is running and .env is properly configured.

6️⃣ Important Notes
----------------------------------------
# Do not commit .env or any secret keys to GitHub.
# Clear cache files (.expo, node_modules) if needed.
# Make sure all dependencies are installed before running the project.
"""