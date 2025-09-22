from flask import Flask, jsonify, request, render_template
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import asc, desc
from datetime import datetime
import os

app = Flask(__name__)

# SQLite DB
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///products.db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db = SQLAlchemy(app)

# --- Model ---
class Product(db.Model):
    __tablename__ = "products"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    description = db.Column(db.Text, nullable=True)
    category = db.Column(db.String(80), nullable=True)   # bonus
    price = db.Column(db.Float, nullable=False, default=0.0)
    stock_quantity = db.Column(db.Integer, nullable=False, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return dict(
            id=self.id,
            name=self.name,
            description=self.description or "",
            category=self.category or "",
            price=self.price,
            stock_quantity=self.stock_quantity,
            created_at=self.created_at.isoformat()
        )

# --- Initial DB + seed ---
def seed_data():
    if Product.query.count() > 0:
        return
    samples = [
        ("Laptop", "14-inch, 16GB RAM, 512GB SSD", "Electronics", 50000, 5),
        ("Mobile", "6.5-inch, 8GB RAM, 128GB", "Electronics", 15000, 10),
        ("Headphones", "Wireless over-ear", "Accessories", 3500, 25),
        ("Backpack", "Laptop backpack, 30L", "Bags", 2200, 15),
        ("Keyboard", "Mechanical, blue switches", "Electronics", 4200, 12),
        ("Mouse", "Wireless ergonomic", "Electronics", 1800, 30),
        ("Water Bottle", "Steel insulated 1L", "Home", 1200, 40),
        ("Shoes", "Running shoes", "Fashion", 3200, 18),
        ("T-shirt", "Cotton, M size", "Fashion", 800, 35),
        ("Book", "Data Structures in Python", "Books", 1400, 20),
        ("Monitor", "24-inch 1080p", "Electronics", 9000, 7),
        ("Power Bank", "20,000 mAh", "Electronics", 2600, 22),
    ]
    for n, d, c, p, s in samples:
        db.session.add(Product(name=n, description=d, category=c, price=p, stock_quantity=s))
    db.session.commit()

with app.app_context():
    if not os.path.exists("products.db"):
        db.create_all()
    else:
        db.create_all()
    seed_data()

# --- Routes ---
@app.route("/")
def home():
    return render_template("index.html")

# Create
@app.route("/api/products", methods=["POST"])
def create_product():
    data = request.get_json() or {}
    # Basic validation
    name = (data.get("name") or "").strip()
    price = data.get("price", 0)
    stock = data.get("stock_quantity", 0)

    if not name:
        return jsonify({"error": "Name is required"}), 400
    try:
        price = float(price)
        stock = int(stock)
    except ValueError:
        return jsonify({"error": "Invalid price or stock"}), 400

    if price <= 0:
        return jsonify({"error": "Price must be > 0"}), 400
    if stock < 0:
        return jsonify({"error": "Stock must be ≥ 0"}), 400

    product = Product(
        name=name,
        description=data.get("description", ""),
        category=data.get("category", ""),
        price=price,
        stock_quantity=stock
    )
    db.session.add(product)
    db.session.commit()
    return jsonify(product.to_dict()), 201

# Read (list/search/filter)
@app.route("/api/products", methods=["GET"])
def list_products():
    q = (request.args.get("q") or "").strip().lower()
    category = (request.args.get("category") or "").strip()
    sort = request.args.get("sort", "created_at_desc")

    query = Product.query
    if q:
        like = f"%{q}%"
        query = query.filter(
            db.or_(
                Product.name.ilike(like),
                Product.description.ilike(like),
                Product.category.ilike(like)
            )
        )
    if category:
        query = query.filter(Product.category == category)

    # simple sort options
    if sort == "price_asc":
        query = query.order_by(asc(Product.price))
    elif sort == "price_desc":
        query = query.order_by(desc(Product.price))
    elif sort == "name_asc":
        query = query.order_by(asc(Product.name))
    elif sort == "name_desc":
        query = query.order_by(desc(Product.name))
    else:
        query = query.order_by(desc(Product.created_at))

    items = [p.to_dict() for p in query.all()]
    return jsonify(items), 200

# Read single
@app.route("/api/products/<int:pid>", methods=["GET"])
def get_product(pid):
    p = Product.query.get_or_404(pid)
    return jsonify(p.to_dict()), 200

# Update
@app.route("/api/products/<int:pid>", methods=["PUT"])
def update_product(pid):
    p = Product.query.get_or_404(pid)
    data = request.get_json() or {}

    if "name" in data:
        if not str(data["name"]).strip():
            return jsonify({"error": "Name cannot be empty"}), 400
        p.name = str(data["name"]).strip()

    if "description" in data:
        p.description = data["description"] or ""

    if "category" in data:
        p.category = data["category"] or ""

    if "price" in data:
        try:
            price = float(data["price"])
            if price <= 0:
                return jsonify({"error": "Price must be > 0"}), 400
            p.price = price
        except ValueError:
            return jsonify({"error": "Invalid price"}), 400

    if "stock_quantity" in data:
        try:
            stock = int(data["stock_quantity"])
            if stock < 0:
                return jsonify({"error": "Stock must be ≥ 0"}), 400
            p.stock_quantity = stock
        except ValueError:
            return jsonify({"error": "Invalid stock"}), 400

    db.session.commit()
    return jsonify(p.to_dict()), 200

# Delete
@app.route("/api/products/<int:pid>", methods=["DELETE"])
def delete_product(pid):
    p = Product.query.get_or_404(pid)
    db.session.delete(p)
    db.session.commit()
    return jsonify({"message": "Deleted"}), 200

if __name__ == "__main__":
    app.run(debug=True)
