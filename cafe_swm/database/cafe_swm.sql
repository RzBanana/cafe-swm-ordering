-- =====================================================
-- DATABASE: cafe_swm
-- Sistem Informasi Pemesanan Cafe SWM
-- =====================================================

CREATE DATABASE IF NOT EXISTS cafe_swm DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE cafe_swm;

-- ---------------------------------------------------
-- Tabel users (admin & kasir)
-- ---------------------------------------------------
DROP TABLE IF EXISTS users;
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  nama VARCHAR(100) NOT NULL,
  role ENUM('admin','kasir') NOT NULL,
  jabatan VARCHAR(50) DEFAULT NULL,
  foto VARCHAR(255) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------------------------------------------------
-- Tabel categories
-- ---------------------------------------------------
DROP TABLE IF EXISTS categories;
CREATE TABLE categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nama VARCHAR(50) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------------------------------------------------
-- Tabel products
-- ---------------------------------------------------
DROP TABLE IF EXISTS products;
CREATE TABLE products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nama VARCHAR(100) NOT NULL,
  category_id INT NOT NULL,
  harga DECIMAL(10,2) NOT NULL,
  deskripsi TEXT,
  gambar VARCHAR(255) DEFAULT NULL,
  status ENUM('ready','sold_out') DEFAULT 'ready',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------
-- Tabel tables_master (meja)
-- ---------------------------------------------------
DROP TABLE IF EXISTS tables_master;
CREATE TABLE tables_master (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nomor_meja VARCHAR(10) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------------------------------------------------
-- Tabel orders
-- ---------------------------------------------------
DROP TABLE IF EXISTS orders;
CREATE TABLE orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nomor_pesanan VARCHAR(30) UNIQUE NOT NULL,
  table_id INT NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  pajak DECIMAL(10,2) DEFAULT 0,
  grand_total DECIMAL(10,2) NOT NULL,
  metode_pembayaran ENUM('tunai','qris','mobile_banking') NOT NULL,
  status_pembayaran ENUM('menunggu','diterima','dibatalkan') DEFAULT 'menunggu',
  status_pesanan ENUM('menunggu_pembayaran','pembayaran_diterima','diproses','dimasak','siap_diantar','selesai','dibatalkan') DEFAULT 'menunggu_pembayaran',
  estimasi_waktu INT DEFAULT 0,
  uang_dibayar DECIMAL(10,2) DEFAULT NULL,
  kembalian DECIMAL(10,2) DEFAULT NULL,
  midtrans_token VARCHAR(255) DEFAULT NULL,
  midtrans_order_id VARCHAR(100) DEFAULT NULL,
  kasir_id INT DEFAULT NULL,
  catatan TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (table_id) REFERENCES tables_master(id),
  FOREIGN KEY (kasir_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ---------------------------------------------------
-- Tabel order_items
-- ---------------------------------------------------
DROP TABLE IF EXISTS order_items;
CREATE TABLE order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  product_id INT NOT NULL,
  nama_produk VARCHAR(100) NOT NULL,
  harga DECIMAL(10,2) NOT NULL,
  jumlah INT NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  catatan TEXT,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB;

-- ---------------------------------------------------
-- Tabel midtrans_logs (audit notifikasi)
-- ---------------------------------------------------
DROP TABLE IF EXISTS midtrans_logs;
CREATE TABLE midtrans_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id VARCHAR(100) NOT NULL,
  transaction_status VARCHAR(50),
  fraud_status VARCHAR(50),
  status_code VARCHAR(10),
  payment_type VARCHAR(50),
  gross_amount VARCHAR(20),
  raw_payload TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_order (order_id)
) ENGINE=InnoDB;

-- =====================================================
-- SEED DATA
-- =====================================================

-- Default credentials:
--   admin / admin123
--   kasir1 / kasir123
--   kasir2 / kasir123
INSERT INTO users (username, password, nama, role, jabatan) VALUES
('admin', '$2y$10$bTa/clQkH8n/NJBxrKOl1ONKOvlQI8brA7csoPpt5d5QdPqms4hju', 'Administrator', 'admin', 'Manager'),
('kasir1', '$2y$10$xjpfMgnp75fQdsjqbcyK/O5kJghALq0I9PctlfTwb/lIsZGIEGodO', 'Budi Santoso', 'kasir', 'Kasir Shift Pagi'),
('kasir2', '$2y$10$xjpfMgnp75fQdsjqbcyK/O5kJghALq0I9PctlfTwb/lIsZGIEGodO', 'Siti Rahma', 'kasir', 'Kasir Shift Sore');

INSERT INTO categories (nama) VALUES
('Makanan'),
('Minuman'),
('Snack');

INSERT INTO products (nama, category_id, harga, deskripsi, status) VALUES
('Nasi Goreng Spesial', 1, 25000, 'Nasi goreng dengan telur, ayam suwir, dan kerupuk', 'ready'),
('Ayam Geprek', 1, 22000, 'Ayam crispy digeprek dengan sambal bawang pedas', 'ready'),
('Mie Goreng', 1, 20000, 'Mie goreng spesial dengan topping telur dan ayam', 'ready'),
('Es Teh Manis', 2, 6000, 'Teh manis dingin segar', 'ready'),
('Kopi Susu', 2, 18000, 'Kopi susu signature dengan gula aren', 'ready'),
('Cappuccino', 2, 25000, 'Cappuccino dengan latte art', 'ready'),
('Kentang Goreng', 3, 15000, 'Kentang goreng renyah saus keju', 'ready'),
('Sosis Bakar', 3, 12000, 'Sosis bakar dengan saus BBQ', 'ready'),
('Cireng', 3, 10000, 'Cireng kenyal dengan saus rujak', 'sold_out');

INSERT INTO tables_master (nomor_meja) VALUES
('01'),('02'),('03'),('04'),('05'),
('06'),('07'),('08'),('09'),('10');
