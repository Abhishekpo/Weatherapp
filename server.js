const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const MongoStore = require('connect-mongo');
require('dotenv').config();

const app = express();

// MongoDB connection
mongoose.connect(process.env.MONGO_CONNECTION_STRING, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Session Middleware
app.use(session({
    secret: process.env.SECRET_KEY,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.MONGO_CONNECTION_STRING }),
}));

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Authentication Middleware
function isAuthenticated(req, res, next) {
    if (!req.session.userId) return res.redirect('/');
    next();
}

// Models
const User = mongoose.model('User', new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
}));

const City = mongoose.model('City', new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    cityName: { type: String, required: true },
}));

// Routes
app.get('/', (req, res) => res.render('login', { error: '' }));

app.post('/login', async (req, res) => {
        const { username, password } = req.body;
        const user = await User.findOne({ username });
    
        if (user && await bcrypt.compare(password, user.password)) {
            req.session.userId = user._id.toString(); // Ensure userId is stored as a string in the session
            return res.redirect('/app');
        }
    
        res.render('login', { error: 'Invalid username or password' });
    });
    
app.get('/app', isAuthenticated, (req, res) => res.render('app'));


app.get('/register', (req, res) => res.render('register', { error: '' }));

// POST /register: Handle user registration
app.post('/register', async (req, res) => {
    const { username, password } = req.body;

    try {
        // Check if the username already exists
        const existingUser = await User.findOne({ username });

        if (existingUser) {
            // Render the register page with an error message
            return res.render('register', { error: 'Email already exists' });
        }

        // Hash the password and save the new user
        const hashedPassword = await bcrypt.hash(password, 10);
        await User.create({ username, password: hashedPassword });

        // Redirect to the login page after successful registration
        res.redirect('/');
    } catch (err) {
        console.error('Error during registration:', err);
        res.status(500).send('Internal Server Error');
    }
});

    
app.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) return res.status(500).send('Error during logout');
        res.redirect('/');
    });
});

app.get('/pinned-cities', async (req, res) => {
        if (!req.session.userId) return res.redirect('/');
    
        try {
            const userId = new mongoose.Types.ObjectId(req.session.userId);
    
            // Fetch and group cities by name with count
            const cities = await City.aggregate([
                { $match: { userId } }, // Match the logged-in user's cities
                { $group: { _id: "$cityName", count: { $sum: 1 } } } // Group by cityName and count occurrences
            ]);
    
            res.render('pinned-cities', { cities }); // Pass cities to the template
        } catch (err) {
            console.error("Error fetching pinned cities:", err);
            res.status(500).send("Internal Server Error");
        }
    });
    
    

app.post('/api/delete-all-cities', isAuthenticated, async (req, res) => {
    try {
        await City.deleteMany({ userId: req.session.userId });
        res.redirect('/pinned-cities');
    } catch (err) {
        res.status(500).send('Internal Server Error');
    }
});
app.post('/api/add-city', async (req, res) => {
        if (!req.session.userId) return res.status(401).send('Unauthorized');
    
        try {
            const { cityName } = req.body;
            const city = await City.create({ userId: req.session.userId, cityName });
            res.status(201).json(city);
        } catch (err) {
            console.error("Error adding city:", err);
            res.status(500).send('Error saving city');
        }
    });
    

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
