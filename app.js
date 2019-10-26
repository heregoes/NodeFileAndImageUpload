const express = require('express')
const multer = require('multer')
const ejs = require('ejs')
const path = require('path')
const fs = require('fs')
const MongoClient = require('mongodb').MongoClient
const myurl = 'mongodb://localhost:27017';

//set storage engine
const storage = multer.diskStorage({
    destination: './public/uploads/',
    filename: function(req, file, callback) {
        callback(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname))
    }
})
//init upload 
const upload = multer({
    storage,
    limits: {fileSize: 100000000},
    fileFilter: function(req, file, callback) {
        checkFileType(file, callback)
    }
}).single('myFile')

let imageUpload = null
//check file type
const checkFileType = (file, callback) => {
    //Allowed extensions
    const fileTypes = /jpeg|jpg|png|gif|json|html|js|docx|doc|pdf|txt|xls|xlsx|csv/

    //check extension
    const extname = fileTypes.test(path.extname(file.originalname).toLowerCase())

    //check MIME Type
    const mimeType = fileTypes.test(file.mimetype)

    if (mimeType && extname) {
        const imageTypes = /jpeg|jpg|png|gif/
        imageUpload = imageTypes.test(path.extname(file.originalname).toLowerCase()) ? true : false;
        return callback(null, true)
    } else {
       return callback("Error: Unpermitted File type")
    }
}


//init app
const app = express()

//ejs view engine
app.set('view engine', 'ejs')

//static folder 
app.use(express.static('./public'))

const msg = '';
//routes 
app.get('/', (req, res) => res.render('index', {msg}))

// post files and images
app.post('/upload', (req, res) => {
    upload(req, res, (err) => {
        if (err) {
            res.render('index', { msg: err})
            
        } else {
            if (req.file === undefined) {
                res.render('index', { msg: 'Error No file uploaded'})
            } else {
                if (!imageUpload) {
                    res.render('index', {
                        msg: 'File uploaded successfully',
                        file: `uploads/${req.file.filename}`
                    })
                } else {
                    console.log(req.file)
                    const imgToDatabase = fs.readFileSync(req.file.path)
                    const encode_image = imgToDatabase.toString('base64')

                    // Define a JSONobject for the image attributes for saving to database
                    const finalImg = {
                        contentType: req.file.mimetype,
                        image:  new Buffer(encode_image, 'base64'),
                        imageName: req.file.originalname.replace(/ /g, '%20')
                    }
                    db.collection('imageUploadTest').insertOne(finalImg, (err, result) => {
                        // console.log(result)  
                        if (err) return console.log(err)
                        console.log('saved to database')
                        // res.redirect('/')  
                        res.render('index', {
                            msg: 'Image uploaded successfully',
                            file: `uploads/${req.file.filename}`
                        })
                    })
                }

            }
        }
    })
})

//get images from database

//all photos array
app.get('/photos', (req, res) => {
    db.collection('imageUploadTest').find().toArray((err, result) => {
     
        const imgIdArray = result.map(element => element._id)
        let imgNameArray = result.map(element => 'http://localhost:3000/photo/' + element.imageName)
        imgNameArray = imgNameArray.join('////////////// ')
        console.log(imgNameArray)
     
        if (err) return console.log(err)
        res.render('photos', {imgNameArray})
    })
});

//get individual photo 
app.get('/photo/:name', (req, res) => {
    const imageName = req.params.name.replace(/ /g, '%20');
    db.collection('imageUploadTest').findOne({'imageName': imageName }, (err, result) => {
        if (err) {
            return console.log(err)
        } else if (result) {
            console.log(result.image)
            res.contentType('image/jpeg');
            res.send(result.image.buffer) 
        } else {
            console.log('no result', result)
            res.send('No image available')
        }
        
    })
})

const PORT = 3000;

//mongo instance and app start 
MongoClient.connect(myurl, { useUnifiedTopology: true }, (err, client) => {
    if (err) return console.log(err)
    db = client.db('testUploads')
    console.log(`Connected to Mongodb ${myurl}`)
    app.listen(PORT, () => console.log(`App started on port ${PORT}...`))
})
