const express = require('express');
const cookieParser = require('cookie-parser');
const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 3000;

// Application Secret for signing cookies and generating flags
const APP_SECRET = 'super_secret_bbq_key_2026';

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser(APP_SECRET));

// Database setup
const db = new sqlite3.Database('./database.sqlite');
db.serialize(() => {
    db.run("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, username TEXT, password TEXT, role TEXT, secret_info TEXT)");
    
    // Insert dummy data
    db.run("DELETE FROM users");
    db.run("INSERT INTO users (username, password, role, secret_info) VALUES ('student_john', 'password123', 'student', 'Nothing to see here.')");
    db.run("INSERT INTO users (username, password, role, secret_info) VALUES ('bbq_master', 'super_complex_password_nobody_can_guess!', 'admin', 'Welcome BBQ Master! Your flag is: [FLAG_PLACEHOLDER]')");
    db.run("INSERT INTO users (username, password, role, secret_info) VALUES ('guest', 'guest', 'guest', 'Enjoy the party.')");
});

// Flag generation
function generateFlag(studentId, challengeCode) {
    const hash = crypto.createHmac('sha256', APP_SECRET)
                       .update(`${studentId}_${challengeCode}`)
                       .digest('hex')
                       .substring(0, 6);
    return `FLAG{${studentId}_${hash}_${challengeCode}}`;
}

// Middleware to check if student is logged in
function requireStudent(req, res, next) {
    if (!req.signedCookies.studentId) {
        return res.redirect('/');
    }
    req.studentId = req.signedCookies.studentId;
    next();
}

// Routes
app.get('/', (req, res) => {
    res.render('index');
});

app.post('/login-student', (req, res) => {
    const { studentId } = req.body;
    if (studentId && studentId.trim().length > 0) {
        // Set a signed cookie
        res.cookie('studentId', studentId.trim(), { signed: true, httpOnly: true });
        res.cookie('progress', JSON.stringify([]), { signed: true, httpOnly: true });
        res.redirect('/dashboard');
    } else {
        res.redirect('/');
    }
});

app.get('/logout-student', (req, res) => {
    res.clearCookie('studentId');
    res.clearCookie('progress');
    res.redirect('/');
});

app.get('/dashboard', requireStudent, (req, res) => {
    let progress = [];
    try {
        progress = JSON.parse(req.signedCookies.progress || '[]');
    } catch (e) {}
    
    res.render('dashboard', { studentId: req.studentId, progress });
});

// Challenge 1: Recon (HTML Comments / Robots.txt)
app.get('/challenge/1', requireStudent, (req, res) => {
    const flag = generateFlag(req.studentId, 'RECON');
    res.render('challenge1', { flag });
});

// Challenge 2: SQL Injection
app.get('/challenge/2', requireStudent, (req, res) => {
    res.render('challenge2', { error: null, success: null });
});

app.post('/challenge/2/login', requireStudent, (req, res) => {
    const { username, password } = req.body;
    
    // VULNERABLE SQL QUERY
    const query = `SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`;
    
    db.get(query, (err, row) => {
        if (err) {
            return res.render('challenge2', { error: "Database error: " + err.message, success: null });
        }
        
        if (row) {
            // Check if they logged in as the admin
            if (row.username === 'bbq_master') {
                const flag = generateFlag(req.studentId, 'SQLI');
                res.render('challenge2', { error: null, success: `Welcome BBQ Master! Your flag is: ${flag}` });
            } else {
                res.render('challenge2', { error: `Logged in as ${row.username}, but you are not the BBQ Master!`, success: null });
            }
        } else {
            res.render('challenge2', { error: "Invalid username or password", success: null });
        }
    });
});

// Challenge 3: IDOR
app.get('/challenge/3', requireStudent, (req, res) => {
    // Expected to be accessed like /challenge/3?user_id=1
    const userId = req.query.user_id || 42; // default to a normal user
    
    // We are simulating an IDOR where user_id=2 is the BBQ Master profile
    // In our DB setup: 1 is student_john, 2 is bbq_master, 3 is guest.
    
    db.get("SELECT id, username, role, secret_info FROM users WHERE id = ?", [userId], (err, row) => {
        if (err || !row) {
            return res.render('challenge3', { profile: null, error: "User not found." });
        }
        
        let secret = row.secret_info;
        if (row.username === 'bbq_master') {
            const flag = generateFlag(req.studentId, 'IDOR');
            secret = secret.replace('[FLAG_PLACEHOLDER]', flag);
        }
        
        res.render('challenge3', { profile: { ...row, secret_info: secret }, error: null });
    });
});

// Challenge 4: Path Traversal (LFI)
app.get('/challenge/4', requireStudent, (req, res) => {
    res.render('challenge4');
});

app.get('/download', requireStudent, (req, res) => {
    const file = req.query.file;
    if (!file) {
        return res.send("No file specified.");
    }

    // VULNERABLE FILE READ
    // Do not use path.join securely, allow directory traversal
    const filePath = path.join(__dirname, 'files', file);
    
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            return res.send(`Error reading file: ${file}`);
        }
        
        // If they successfully read the secret file, inject their flag
        if (file.includes('secret_bbq_recipe.txt')) {
             const flag = generateFlag(req.studentId, 'LFI');
             data = data.replace('[FLAG_PLACEHOLDER]', flag);
        }
        
        res.send(`<pre>${data}</pre>`);
    });
});

// Challenge 5: Insecure Data Storage (Base64 Cookie)
app.get('/challenge/5', requireStudent, (req, res) => {
    if (!req.cookies.role) {
        res.cookie('role', Buffer.from('guest').toString('base64'));
        return res.render('challenge5', { role: 'guest', error: null, flag: null });
    }

    let role = '';
    try {
        role = Buffer.from(req.cookies.role, 'base64').toString('ascii');
    } catch (e) {
        role = 'invalid';
    }

    if (role === 'admin') {
        const flag = generateFlag(req.studentId, 'COOKIE');
        res.render('challenge5', { role, error: null, flag });
    } else {
        res.render('challenge5', { role, error: 'You are not an admin!', flag: null });
    }
});

// Challenge 6: Client-Side Validation Bypass
app.get('/challenge/6', requireStudent, (req, res) => {
    res.render('challenge6', { error: null, flag: null });
});

app.post('/challenge/6/buy', requireStudent, (req, res) => {
    const price = parseInt(req.body.price, 10);
    
    if (isNaN(price)) {
        return res.render('challenge6', { error: "Invalid price format.", flag: null });
    }
    
    if (price <= 0) {
        const flag = generateFlag(req.studentId, 'BYPASS');
        res.render('challenge6', { error: null, flag });
    } else {
        res.render('challenge6', { error: "Insufficient credits! You need " + price + " credits.", flag: null });
    }
});

// Verify flags endpoint
app.post('/verify-flag', requireStudent, (req, res) => {
    const { flag } = req.body;
    let progress = [];
    try {
        progress = JSON.parse(req.signedCookies.progress || '[]');
    } catch (e) {}

    const challenges = ['RECON', 'SQLI', 'IDOR', 'LFI', 'COOKIE', 'BYPASS'];
    let valid = false;
    let matchedChallenge = '';

    for (let c of challenges) {
        if (flag === generateFlag(req.studentId, c)) {
            valid = true;
            matchedChallenge = c;
            if (!progress.includes(c)) {
                progress.push(c);
            }
            break;
        }
    }

    if (valid) {
        res.cookie('progress', JSON.stringify(progress), { signed: true, httpOnly: true });
        res.json({ success: true, message: `Correct! You solved the ${matchedChallenge} challenge!`, progress });
    } else {
        res.json({ success: false, message: "Invalid flag." });
    }
});

// Initialize secret file for LFI
const filesDir = path.join(__dirname, 'files');
if (!fs.existsSync(filesDir)) fs.mkdirSync(filesDir);
fs.writeFileSync(path.join(filesDir, 'menu.txt'), '1. Burgers\n2. Hotdogs\n3. Vegan Burgers (by The Vegan Vanguard)');
fs.writeFileSync(path.join(__dirname, 'secret_bbq_recipe.txt'), 'The secret sauce recipe is... just ketchup and mayo.\nFlag: [FLAG_PLACEHOLDER]');


app.listen(port, () => {
    console.log(`Operation: Save the BBQ! listening at http://localhost:${port}`);
});
