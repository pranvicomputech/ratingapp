const express = require('express')
const cors = require('cors')
const multer = require('multer')
const path = require('path')
const dotenv = require('dotenv')

const connectDB = require('./config/db')
const Store = require('./models/Store')
const Rating = require('./models/Rating')

dotenv.config()
connectDB()

const app = express()

app.use(cors())
app.use(express.json())
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
})

const upload = multer({ storage })

const slugify = text => text.toLowerCase().replace(/ /g, '-')

// Admin add store with image
app.post('/admin/add-store', upload.single('image'), async (req, res) => {
  const { name, mapLink, token } = req.body
  if (token !== process.env.ADMIN_TOKEN)
    return res.status(403).json({ error: 'Unauthorized' })

  if (!name || !mapLink || !req.file)
    return res.status(400).json({ error: 'Missing fields' })

  const slug = slugify(name)
  const image = req.file.filename

  const existing = await Store.findOne({ slug })
  if (existing)
    return res.status(400).json({ error: 'Store already exists' })

  const store = await Store.create({ name, slug, mapLink, image })
  res.json({ message: 'Store added', store })
})

// Get all stores with average ratings
app.get('/stores', async (req, res) => {
  const stores = await Store.find()
  const results = await Promise.all(stores.map(async s => {
    const ratings = await Rating.find({ storeSlug: s.slug })
    const avg = ratings.length
      ? (ratings.reduce((a, b) => a + b.rating, 0) / ratings.length).toFixed(1)
      : null

    return {
      name: s.name,
      slug: s.slug,
      image: s.image,
      mapLink: s.mapLink,
      averageRating: avg
    }
  }))
  res.json(results)
})

// Get single store with average rating
app.get('/store/:slug', async (req, res) => {
  const store = await Store.findOne({ slug: req.params.slug })
  if (!store)
    return res.status(404).json({ error: 'Not found' })

  const ratings = await Rating.find({ storeSlug: store.slug })
  const avg = ratings.length
    ? (ratings.reduce((a, b) => a + b.rating, 0) / ratings.length).toFixed(1)
    : null

  res.json({ store, averageRating: avg })
})

// Submit rating
app.post('/store/:slug/rate', async (req, res) => {
  const { userName, userMobile, rating } = req.body
  const { slug } = req.params

  if (!userName || !userMobile || rating < 1 || rating > 5)
    return res.status(400).json({ error: 'Invalid input' })

  const existing = await Rating.findOne({ storeSlug: slug, userMobile })
  if (existing)
    return res.status(403).json({ error: 'Already rated' })

  const saved = await Rating.create({ storeSlug: slug, userName, userMobile, rating })
  res.json({ message: 'Rating submitted', rating: saved })
})

// Get all ratings for a store
app.get('/store/:slug/ratings', async (req, res) => {
  const ratings = await Rating.find({ storeSlug: req.params.slug })
  res.json(ratings)
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`))