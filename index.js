const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
let bodyParser = require('body-parser')

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
const Schema = mongoose.Schema

let UserSchema = new Schema({
  username: {type: String, required: true},
})

let ExerciseSchema = new Schema({
  user_id: {type: String, required: true},
  description: {type: String, required: true},
  duration: {type: String, required: true},
  date: {type: String, required: true},
})

const User = mongoose.model('User', UserSchema)
const Exercise = mongoose.model('Exercise', ExerciseSchema)

app.post('/api/users', async (req, res) => {
  const { username } = req.body;

  if (!username) {
    return res.status(400).json({ error: 'Username must be filled!' });
  }

  try {
    // Check if the username already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: 'Username already taken!' });
    }

    // Create and save new user
    const newUser = new User({ username });
    await newUser.save();

    return res.status(201).json({ username: newUser.username, _id: newUser._id });
  } catch (err) {
    return res.status(500).json({ error: 'Server error', details: err.message });
  }
});

app.get('/api/users/:id/logs', async (req, res) => {
  const { id } = req.params;
  const { from, to, limit } = req.query;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'Invalid User ID format' });
  }

  try {
    const user = await User.findById(new mongoose.Types.ObjectId(id));
    if (!user) {
      return res.status(404).json({ error: 'User not found!' });
    }

    let filter = { user_id: id };

    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }

    let query = Exercise.find(filter).sort({ date: 1 });

    if (limit) {
      query = query.limit(parseInt(limit));
    }

    const exercises = await query.exec();

    return res.json({
      username: user.username,
      _id: user._id,
      count: exercises.length,
      log: exercises.map(ex => ({
        description: ex.description,
        duration: ex.duration,
        date: ex.date.toDateString()
      }))
    });
  } catch (err) {
    return res.status(500).json({ error: 'Server error', details: err.message });
  }
});

app.post('/api/users/:id/exercises', async (req, res) => {
  const { id } = req.params;
  let { description, duration, date } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'Invalid User ID format' });
  }

  date = date ? new Date(date) : new Date();

  try {
    const user = await User.findById(new mongoose.Types.ObjectId(id));
    if (!user) {
      return res.status(404).json({ error: 'User not found!' });
    }

    const newExercise = new Exercise({
      user_id: id,
      description,
      duration,
      date
    });

    await newExercise.save();

    return res.json({
      username: user.username,
      description: newExercise.description,
      duration: newExercise.duration,
      date: newExercise.date,
      _id: user._id
    });
  } catch (err) {
    return res.status(500).json({ error: 'Server error', details: err.message });
  }
});



const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
