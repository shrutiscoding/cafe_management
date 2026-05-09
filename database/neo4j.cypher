"/**
 * Neo4j driver wrapper.
 */

const neo4j = require('neo4j-driver');

let driver = null;

async function init() {
    if (driver) return driver;
    const url = process.env.NEO4J_URL;
    if (!url) throw new Error('NEO4J_URL not set');
    driver = neo4j.driver(
        url,
        neo4j.auth.basic(process.env.NEO4J_USER || 'neo4j', process.env.NEO4J_PASSWORD || '')
    );
    await driver.verifyConnectivity();
    return driver;
}

async function close() {
    if (driver) { await driver.close(); driver = null; }
}

function isReady() { return driver !== null; }

async function run(cypher, params = {}) {
    if (!driver) throw new Error('Neo4j not initialised');
    const session = driver.session();
    try {
        const res = await session.run(cypher, params);
        return res.records.map(r => r.toObject());
    } finally {
        await session.close();
    }
}

module.exports = { init, close, isReady, run };
"

CREATE CONSTRAINT customer_id IF NOT EXISTS
    FOR (c:Customer) REQUIRE c.id IS UNIQUE;

CREATE CONSTRAINT item_id IF NOT EXISTS
    FOR (i:Item) REQUIRE i.id IS UNIQUE;

CREATE CONSTRAINT order_id IF NOT EXISTS
    FOR (o:Order) REQUIRE o.id IS UNIQUE;

CREATE INDEX customer_branch IF NOT EXISTS
    FOR (c:Customer) ON (c.home_branch);

CREATE INDEX item_category IF NOT EXISTS
    FOR (i:Item) ON (i.category);
"

"// =====================================================================
// Brewgraph :: Neo4j :: 10 Seed graph
// Nodes:  Customer, Item, Order
// Edges:  (:Customer)-[:PLACED]->(:Order)-[:CONTAINS]->(:Item)
//         (:Customer)-[:ORDERED { qty }]->(:Item)   (denormalised for fast traversal)
//         (:Customer)-[:RATED   { stars }]->(:Item)
// =====================================================================

// Wipe (dev only)
MATCH (n) DETACH DELETE n;

// ---------- Customers ----------
UNWIND [
    {id:'CUST-001', name:'Aarav Sharma',   home_branch:'PUNE',   tier:'GOLD'},
    {id:'CUST-002', name:'Priya Mehta',    home_branch:'MUMBAI', tier:'SILVER'},
    {id:'CUST-003', name:'Rahul Iyer',     home_branch:'PUNE',   tier:'PLATINUM'},
    {id:'CUST-004', name:'Chloe Customer', home_branch:'MUMBAI', tier:'BRONZE'}
] AS c
CREATE (:Customer {id:c.id, name:c.name, home_branch:c.home_branch, tier:c.tier});

// ---------- Items ----------
UNWIND [
    {id:'ITM-001', name:'Cappuccino',       category:'Beverage', price:120},
    {id:'ITM-002', name:'Espresso',         category:'Beverage', price: 90},
    {id:'ITM-003', name:'Latte',            category:'Beverage', price:140},
    {id:'ITM-004', name:'Cold Brew',        category:'Beverage', price:150},
    {id:'ITM-005', name:'Croissant',        category:'Pastry',   price: 80},
    {id:'ITM-006', name:'Blueberry Muffin', category:'Pastry',   price:130},
    {id:'ITM-007', name:'Avocado Toast',    category:'Food',     price:140},
    {id:'ITM-008', name:'Veg Sandwich',     category:'Food',     price:110}
] AS i
CREATE (:Item {id:i.id, name:i.name, category:i.category, price:i.price});

// ---------- ORDERED edges (with quantity) ----------
UNWIND [
    {c:'CUST-001', i:'ITM-001', qty:2},
    {c:'CUST-001', i:'ITM-005', qty:1},
    {c:'CUST-002', i:'ITM-003', qty:2},
    {c:'CUST-002', i:'ITM-006', qty:1},
    {c:'CUST-003', i:'ITM-002', qty:1},
    {c:'CUST-003', i:'ITM-003', qty:1},
    {c:'CUST-004', i:'ITM-004', qty:1},
    {c:'CUST-004', i:'ITM-007', qty:1}
] AS row
MATCH (c:Customer {id:row.c}), (i:Item {id:row.i})
MERGE (c)-[r:ORDERED]->(i)
ON CREATE SET r.qty = row.qty, r.first_at = datetime()
ON MATCH  SET r.qty = coalesce(r.qty,0) + row.qty, r.last_at = datetime();

// ---------- RATED edges ----------
UNWIND [
    {c:'CUST-004', i:'ITM-004', stars:5, comment:'nice'},
    {c:'CUST-001', i:'ITM-001', stars:4, comment:'frothy & warm'},
    {c:'CUST-003', i:'ITM-003', stars:5, comment:'silky'}
] AS r
MATCH (c:Customer {id:r.c}), (i:Item {id:r.i})
MERGE (c)-[rt:RATED]->(i)
SET rt.stars = r.stars, rt.comment = r.comment, rt.at = datetime();
"

"// =====================================================================
// Brewgraph :: Neo4j :: 20 Recommendation Queries (Cypher)
// =====================================================================

// 1. Items a customer has already ordered
MATCH (c:Customer {id:$customer_id})-[r:ORDERED]->(i:Item)
RETURN i.id AS id, i.name AS name, i.category AS category, r.qty AS qty
ORDER BY r.qty DESC;

// 2. \"Customers who bought X also bought Y\" (item-based collaborative filtering)
MATCH (target:Item {id:$item_id})<-[:ORDERED]-(buddy:Customer)-[:ORDERED]->(other:Item)
WHERE other.id <> $item_id
RETURN other.id   AS id,
       other.name AS name,
       count(DISTINCT buddy) AS co_buyers
ORDER BY co_buyers DESC
LIMIT 5;

// 3. Personalised recommendations for a customer
//    Items ordered by similar customers, excluding ones the user already bought.
MATCH (me:Customer {id:$customer_id})-[:ORDERED]->(:Item)<-[:ORDERED]-(peer:Customer)
WHERE peer.id <> me.id
WITH me, peer, count(*) AS overlap
ORDER BY overlap DESC
LIMIT 25
MATCH (peer)-[:ORDERED]->(rec:Item)
WHERE NOT (me)-[:ORDERED]->(rec)
RETURN rec.id   AS id,
       rec.name AS name,
       rec.category AS category,
       sum(overlap) AS score
ORDER BY score DESC
LIMIT 10;

// 4. Highly rated items that a customer hasn't tried yet
MATCH (i:Item)<-[r:RATED]-(:Customer)
WITH i, avg(r.stars) AS rating, count(r) AS n
WHERE n >= 1
OPTIONAL MATCH (me:Customer {id:$customer_id})-[:ORDERED]->(i)
WITH i, rating, n, me
WHERE me IS NULL
RETURN i.id AS id, i.name AS name, rating, n
ORDER BY rating DESC, n DESC
LIMIT 5;

// 5. Branch-local trend: top 5 items ordered by customers of a branch
MATCH (c:Customer {home_branch:$branch})-[r:ORDERED]->(i:Item)
RETURN i.id AS id, i.name AS name, sum(r.qty) AS units
ORDER BY units DESC
LIMIT 5;

// 6. Two-hop \"similar customers\"  (people you might share taste with)
MATCH (me:Customer {id:$customer_id})-[:ORDERED]->(:Item)<-[:ORDERED]-(peer:Customer)
WHERE peer.id <> me.id
RETURN peer.id   AS id,
       peer.name AS name,
       count(*)  AS shared_items
ORDER BY shared_items DESC
LIMIT 10;
"