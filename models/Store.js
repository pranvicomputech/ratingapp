const mongoose = require('mongoose')
const storeSchema = new mongoose.Schema({
    name: String,
    slug: String,
    mapLink: String,
    image: String
})
module.exports = mongoose.model('Store', storeSchema)
