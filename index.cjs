const express = require('express')
const app = express()
const cors = require('cors')
const mongoose = require('mongoose')
require('dotenv').config()

const port = process.env.PORT || 3000
const uri = process.env.MONGO_URI

mongoose.connect(uri)

const logSchema = new mongoose.Schema({
  username: String,
  count: Number,
  log: [
    {
      description: String,
      duration: Number,
      date: String
    }
  ]
})

const Log = mongoose.model('Log', logSchema)

const createUser = async (username, done) => {
  try {
    const log = new Log({
      username,
      count: 0,
      log: []
    })
    await log.save()
    done(null, {
      username,
      _id: log._id
    })
  } catch (error) {
    done(error)
  }
}

const getAllUsers = async done => {
  try {
    const data = await Log.find().select({
      username: true,
      _id: true
    })
    done(null, data)
  } catch (error) {
    done(error)
  }
}

const createExercise = async (_id, description, duration, date, done) => {
  try {
    const data = await Log.findOneAndUpdate(
      { _id },
      {
        $push: {
          log: {
            description,
            duration,
            date
          }
        },
        $inc: { count: 1 }
      },
      { new: true }
    )
    done(null, {
      _id,
      username: data.username,
      date: new Date(date).toDateString(),
      duration: Number(duration),
      description
    })
  } catch (error) {
    done(error)
  }
}

const getAllExercisesByUserId = async (_id, from = '', to = '', limit = '', done) => {
  try {
    const data = await Log.findOne({ _id })

    if (from && to) {
      const fromDate = new Date(from).getTime()
      const toDate = new Date(to).getTime()
      data.log = data.log.filter(exercise => {
        const exerciseDate = new Date(exercise.date).getTime()
        return exerciseDate >= fromDate && exerciseDate <= toDate
      })
    }

    if (limit) {
      data.log = data.log.slice(0, limit)
    }

    done(null, data)
  } catch (error) {
    done(error)
  }
}

app.use(express.urlencoded({ extended: false }))
app.use(cors())
app.use(express.static('public'))

// view complete API  call in  a middleware
app.use((req, _, next) => {
  console.log(`${req.method} ${req.path}`)
  next()
})

app.get('/', (_, res) => {
  res.sendFile(__dirname + '/views/index.html')
})

app.get('/api/users', async (_, res, next) => {
  await getAllUsers((err, data) => {
    if (err) return next(err)
    if (!data) return next({ message: 'no data' })
    res.json(data)
  })
})

app.post('/api/users', async (req, res, next) => {
  const { username } = req.body
  await createUser(username, (err, data) => {
    if (err) return next(err)
    if (!data) return next({ message: 'no data' })
    res.json(data)
  })
})

app.get('/api/users/:_id/logs', async (req, res, next) => {
  const { _id } = req.params
  const { from, to, limit } = req.query

  await getAllExercisesByUserId(_id, from, to, limit, (err, data) => {
    if (err) return next(err)
    if (!data) return next({ message: 'no data' })
    res.json(data)
  })
})

app.post('/api/users/:_id/exercises', async (req, res, next) => {
  const { _id } = req.params
  const { description, duration } = req.body
  const date = req.body.date || new Date().toDateString()
  await createExercise(_id, description, duration, date, (err, data) => {
    if (err) return next(err)
    if (!data) return next({ message: 'no data' })
    res.json(data)
  })
})

// Error handling middleware
app.use((err, _, res, next) => {
  if (err) res.status(err.status || 500).json({ error: err.message || 'SERVER ERROR' })
  next()
})

const listener = app.listen(port, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
