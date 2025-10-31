CREATE DATABASE IF NOT EXISTS online_voting;
USE online_voting;

CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('voter','admin') DEFAULT 'voter'
);
ALTER TABLE users
ADD COLUMN is_verified BOOLEAN DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS elections (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  start_time DATETIME NOT NULL,
  end_time DATETIME NOT NULL,
  status ENUM('pending','active','closed') DEFAULT 'pending'
);

CREATE TABLE IF NOT EXISTS votes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  election_id INT NOT NULL,
  voter_id INT NOT NULL,
  candidate_id INT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (election_id) REFERENCES elections(id),
  FOREIGN KEY (voter_id) REFERENCES users(id)
);
