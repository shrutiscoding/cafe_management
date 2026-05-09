-- =====================================================================
-- ORACLE DATABASE — Cafe Management System (FULL ERP)
-- Features:
-- OODBMS Types, Inheritance, Partitioning, Fragmentation,
-- ERP Modules: Auth, Orders, Inventory, Sales, Payments
-- =====================================================================

ALTER SESSION SET CONTAINER = XEPDB1;

-- =========================
-- USER SETUP
-- =========================
DROP USER cafe_db CASCADE;

CREATE USER cafe_db IDENTIFIED BY cafe123;

GRANT CREATE SESSION TO cafe_db;
GRANT CREATE TABLE TO cafe_db;
GRANT CREATE VIEW TO cafe_db;
GRANT CREATE TRIGGER TO cafe_db;
GRANT CREATE SEQUENCE TO cafe_db;

ALTER USER cafe_db QUOTA UNLIMITED ON USERS;
-- =========================
-- COMPLEX TYPE (OODBMS)
-- =========================
CREATE OR REPLACE TYPE address_t AS OBJECT (
    street  VARCHAR2(100),
    city    VARCHAR2(50),
    state   VARCHAR2(50),
    pincode VARCHAR2(10)
);
/

CREATE OR REPLACE TYPE person_t AS OBJECT (
    id    VARCHAR2(36),
    name  VARCHAR2(100),
    phone VARCHAR2(20),
    addr  address_t
) NOT FINAL;
/

CREATE OR REPLACE TYPE customer_t UNDER person_t (
    loyalty_points NUMBER
);
/

CREATE OR REPLACE TYPE employee_t UNDER person_t (
    role       VARCHAR2(20),
    salary     NUMBER,
    hire_date  DATE
);
/


-- =========================
-- CUSTOMERS
-- =========================
CREATE TABLE customers (
    id            VARCHAR2(36) PRIMARY KEY,
    name          VARCHAR2(100) NOT NULL,
    email         VARCHAR2(120) UNIQUE NOT NULL,
    phone         VARCHAR2(20),
    password_hash VARCHAR2(200) NOT NULL,
    role          VARCHAR2(20) DEFAULT 'customer',
    created_at    TIMESTAMP DEFAULT SYSTIMESTAMP
);



-- =========================
-- ORDERS (RANGE PARTITIONED)
-- =========================
CREATE TABLE orders (
    id            VARCHAR2(36) PRIMARY KEY,
    customer_id   VARCHAR2(36),
    customer_name VARCHAR2(100),
    total         NUMBER(10,2),
    branch        VARCHAR2(30),
    notes         VARCHAR2(500),
    status        VARCHAR2(20) DEFAULT 'new',
    created_at    TIMESTAMP DEFAULT SYSTIMESTAMP
)
PARTITION BY RANGE (created_at) (
    PARTITION orders_2024 VALUES LESS THAN (TO_DATE('01-01-2025','DD-MM-YYYY')),
    PARTITION orders_2025 VALUES LESS THAN (TO_DATE('01-01-2026','DD-MM-YYYY')),
    PARTITION orders_2026 VALUES LESS THAN (TO_DATE('01-01-2027','DD-MM-YYYY')),
    PARTITION orders_future VALUES LESS THAN (MAXVALUE)
);

-- Horizontal Fragmentation
CREATE TABLE orders_pune   AS SELECT * FROM orders WHERE 1=0;
CREATE TABLE orders_mumbai AS SELECT * FROM orders WHERE 1=0;
CREATE TABLE orders_delhi  AS SELECT * FROM orders WHERE 1=0;

-- =========================
-- ORDER ITEMS
-- =========================
CREATE TABLE order_items (
    id         VARCHAR2(36) PRIMARY KEY,
    order_id   VARCHAR2(36) REFERENCES orders(id),
    item_id    VARCHAR2(36),
    item_name  VARCHAR2(100),
    quantity   NUMBER,
    unit_price NUMBER(10,2)
);

CREATE INDEX idx_order_items_oid ON order_items(order_id);

-- =========================
-- PAYMENTS
-- =========================
CREATE TABLE payments (
    id         VARCHAR2(36) PRIMARY KEY,
    order_id   VARCHAR2(36) REFERENCES orders(id),
    amount     NUMBER(10,2),
    method     VARCHAR2(20),
    status     VARCHAR2(20),
    created_at TIMESTAMP DEFAULT SYSTIMESTAMP
);

-- =========================
-- INVENTORY
-- =========================
CREATE TABLE inventory (
    id            VARCHAR2(36) PRIMARY KEY,
    name          VARCHAR2(100),
    quantity      NUMBER(10,2),
    unit          VARCHAR2(20),
    reorder_level NUMBER(10,2)
);

-- =========================
-- EMPLOYEES
-- =========================
CREATE TABLE employees (
    id        VARCHAR2(36) PRIMARY KEY,
    name      VARCHAR2(100),
    role      VARCHAR2(30),
    salary    NUMBER(10,2),
    hire_date DATE,
    branch    VARCHAR2(30)
);

-- =========================
-- SALES
-- =========================
CREATE TABLE sales (
    id          VARCHAR2(36) PRIMARY KEY,
    order_id    VARCHAR2(36),
    total       NUMBER(10,2),
    discount    NUMBER(10,2),
    final_total NUMBER(10,2),
    created_at  TIMESTAMP DEFAULT SYSTIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id)
);

-- =========================
-- PURCHASES
-- =========================
CREATE TABLE purchases (
    id        VARCHAR2(36) PRIMARY KEY,
    supplier  VARCHAR2(100),
    total     NUMBER(10,2),
    status    VARCHAR2(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT SYSTIMESTAMP
);

-- =========================
-- AUDIT LOGS
-- =========================
CREATE TABLE audit_logs (
    id           VARCHAR2(36) PRIMARY KEY,
    action       VARCHAR2(100),
    entity       VARCHAR2(50),
    entity_id    VARCHAR2(36),
    performed_by VARCHAR2(100),
    timestamp    TIMESTAMP DEFAULT SYSTIMESTAMP
);

-- =========================
-- INDEXES
-- =========================
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(status);

-- =========================
-- TRIGGER (AUTO STOCK UPDATE)
-- =========================
CREATE OR REPLACE TRIGGER trg_reduce_stock
AFTER INSERT ON order_items
FOR EACH ROW
BEGIN
    UPDATE inventory
    SET quantity = quantity - :NEW.quantity
    WHERE id = :NEW.item_id;
END;
/

CREATE TABLE cart (
    id          VARCHAR2(36) PRIMARY KEY,
    customer_id VARCHAR2(36),
    item_id     VARCHAR2(36),
    item_name   VARCHAR2(100),
    price       NUMBER(10,2),
    quantity    NUMBER DEFAULT 1,
    created_at  TIMESTAMP DEFAULT SYSTIMESTAMP,

    CONSTRAINT fk_cart_customer
        FOREIGN KEY (customer_id)
        REFERENCES customers(id)
        ON DELETE CASCADE,

    CONSTRAINT unique_cart_item
        UNIQUE (customer_id, item_id)
);

ALTER TABLE cart ADD image VARCHAR2(255);
