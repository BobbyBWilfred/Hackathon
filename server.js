import express from 'express';
import bcrypt from 'bcryptjs';
import bodyParser from 'body-parser';
import mongoose from 'mongoose';
import path, { dirname } from 'path';
import http from 'http';
import { Server } from 'socket.io'; 
import session from 'express-session';
import { fileURLToPath } from 'url';
import MongoStore from 'connect-mongo';

app.use(session({
  secret: 'your-strong-secret-key',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: 'mongodb+srv://BobbyBWilfred:Legendbob2005%23@bbwcluster.0ctao.mongodb.net/bbwDatabase'
  })
}));


const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PORT = 7000;

// MongoDB Connection
mongoose.connect('mongodb+srv://BobbyBWilfred:Legendbob2005%23@bbwcluster.0ctao.mongodb.net/bbwDatabase?retryWrites=true&w=majority&appName=BBWCluster')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));


// Define Schemas & Models
const participantSchema = new mongoose.Schema({
    regNo: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    team: { type: String, required: true },
    password: { type: String, required: true },
    attendance: {
        start: { type: Boolean, default: false },
        night: { type: Boolean, default: false },
        other: { type: Boolean, default: false }
    },
    scores: {
        review1: {
            "Innovation & Creativity": { type: Number, default: 0 },
            "Technical Implementation": { type: Number, default: 0 },
            "Functionality & Usability": { type: Number, default: 0 },
            "Business Potential & Impact": { type: Number, default: 0 },
            "Presentation & Pitch": { type: Number, default: 0 },
            total: { type: Number, default: 0 }
        },
        review2: {
            "Innovation & Creativity": { type: Number, default: 0 },
            "Technical Implementation": { type: Number, default: 0 },
            "Functionality & Usability": { type: Number, default: 0 },
            "Business Potential & Impact": { type: Number, default: 0 },
            "Presentation & Pitch": { type: Number, default: 0 },
            total: { type: Number, default: 0 }
        },
        review3: {
            "Innovation & Creativity": { type: Number, default: 0 },
            "Technical Implementation": { type: Number, default: 0 },
            "Functionality & Usability": { type: Number, default: 0 },
            "Business Potential & Impact": { type: Number, default: 0 },
            "Presentation & Pitch": { type: Number, default: 0 },
            total: { type: Number, default: 0 }
        },
        final: { type: Number, default: 0 }
    }
});

const adminSchema = new mongoose.Schema({
    regNo: String,
    name: String,
    password: String,
});

const Participant = mongoose.model('Participant', participantSchema);
const Admin = mongoose.model('Admin', adminSchema);

const app = express();
const server = http.createServer(app);


app.use(express.static(path.join(__dirname, 'public')));


async function hashPassword(password) {
    return await bcrypt.hash(password, 10);
}

app.get('/api/teams', async (req, res) => {
    if (req.session.role !== 'admin') return res.status(403).json({ message: "Unauthorized" });
    try {
        const teams = await Participant.aggregate([
            {
                $group: {
                    _id: "$team",
                    name: { $first: "$team" }, 
                    members: { $push: "$name" }, 
                    scores: { $first: "$scores" } 
                }
            },
            { $project: { _id: 1, name: 1, members: 1, scores: 1 } }
        ]);

        res.json(teams);
    } catch (error) {
        console.error("Error fetching teams:", error);
        res.status(500).json({ message: "Error fetching teams" });
    }
});

app.post('/participant/login', async (req, res) => {
    const { regNo, password } = req.body;
    try {
        const participant = await Participant.findOne({ regNo });
        if (!participant) return res.status(401).json({ success: false, message: 'Invalid credentials!' });

        const passwordMatch = await bcrypt.compare(password, participant.password);
        if (passwordMatch) {
            req.session.regNo = regNo;
            req.session.role = 'participant';
            return res.json({ success: true, role: 'participant', name: participant.name });
        } else {
            return res.status(401).json({ success: false, message: 'Invalid credentials!' });
        }
    } catch (error) {
        console.error("Participant login error:", error);
        return res.status(500).json({ success: false, message: 'Login error' });
    }
});

async function calculateScore(review) {
    let total = 0;
    for (const param in review) {
        if (param !== 'total') {
            total += review[param] || 0;
        }
    }
    return total;
}
  

app.get('/api/participants', async (req, res) => {
    if (req.session.role !== 'admin') return res.status(403).json({ message: "Unauthorized" });
    try {
        const participants = await Participant.find({}, 'name regNo team scores attendance');
        res.json(participants);
    } catch (error) {
        console.error("Error fetching participants:", error);
        res.status(500).json({ message: "Error fetching participants" });
    }
});

  
  

  app.post('/api/mark-scores', async (req, res) => {
    if (req.session.role !== 'admin') return res.status(403).json({ message: "Unauthorized" });

    const { teamId, reviewNumber, scores } = req.body;

    try {
        const participants = await Participant.find({ team: teamId });
        if (!participants || participants.length === 0) {
            return res.status(404).json({ message: "Team not found" });
        }

        const reviewTotal = Object.values(scores).reduce((acc, val) => acc + (val || 0), 0);

        const updatePromises = participants.map(async participant => {
            participant.scores = participant.scores || {};

            participant.scores[`review${reviewNumber}`] = { ...scores, total: reviewTotal };

            let finalScore = 0;

            Object.keys(participant.scores).forEach(key => {
                if (key.startsWith('review') && participant.scores[key].total) {
                    finalScore += participant.scores[key].total;
                }
            });

            participant.scores.final = finalScore; 

            return participant.save();
        });

        await Promise.all(updatePromises);

        res.json({ success: true, message: "Scores updated successfully", finalScore: participants[0].scores.final });

    } catch (error) {
        console.error("Error updating scores:", error);
        res.status(500).json({ message: "Error updating scores" });
    }
});


app.post('/admin/login', async (req, res) => {
    const { regNo, password } = req.body;
    try {
        const admin = await Admin.findOne({ regNo });
        if (!admin) return res.status(401).json({ success: false, message: 'Invalid credentials!' });

        const passwordMatch = await bcrypt.compare(password, admin.password);
        if (passwordMatch) {
            req.session.regNo = regNo;
            req.session.role = 'admin';
            return res.json({ success: true, role: 'admin', name: admin.name });
        } else {
            return res.status(401).json({ success: false, message: 'Invalid credentials!' });
        }
    } catch (error) {
        console.error("Admin login error:", error);
        return res.status(500).json({ success: false, message: 'Login error' });
    }
});



app.post('/api/mark-attendance', async (req, res) => {
    if (req.session.role !== 'admin') return res.status(403).json({ message: "Unauthorized" });

    const { regNo, attendanceType, value } = req.body;

    try {
        const participant = await Participant.findOne({ regNo });
        if (!participant) return res.status(404).json({ message: "Participant not found" });

        participant.attendance = participant.attendance || { start: false, night: false, other: false };

        participant.attendance[attendanceType] = value;
        await participant.save();

        res.json({ success: true, message: "Attendance updated successfully" });
    }  catch (error) {
        console.error("Error updating attendance:", error);
        res.status(500).json({ message: "Error updating attendance" });
    }
});



app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'hackathon.html'));
});


server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
