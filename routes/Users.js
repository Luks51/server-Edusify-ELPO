const express = require("express")
const router = express.Router()
const { Users, Projects } = require("../models")
const { Op } = require("sequelize")
const bcrypt = require("bcrypt")
const nodemailer = require('nodemailer')
require('dotenv').config()

const { createTokens, validateToken, createTokenForgotPassword, validateTokenForgotPassword } = require("../middlewares/AuthMiddleware")

// Sa sequelizeom moramo koristiti asinkroni način rada

router.post("/", async (req, res) => {
    const { name, surname, username, email, password, uapp } = req.body

    if (!(name == "") &&
        !(surname == "") &&
        !(username == "") &&
        !(email == "") &&
        !(password == "")) {
            const user = await Users.findOne({ where: {
                [Op.or]: [
                { email: email },
                { username: username }
              ]}
            })
        
            if (user) {
                res.json({ error: "User already exist" });
            } else if (uapp == 1) {
                bcrypt.hash(password, 10).then((hash) => {
                    Users.create({
                        name: name,
                        surname: surname,
                        username: username,
                        email: email,
                        password: hash,
                        uapp: uapp
                    }).then(() => {
                        res.json("SUCCESS")
                      }).catch(() => {
                        res.json({ error: "Invalid input" })
                      })
                    
                })
            } else {
                res.json({ error: "You have to accept User Agreement and Privacy Policy" })
            }
        } else {
            res.json({ error: "You must fill in all the required fields" })
        }
})

router.post("/login", async (req, res) => {
    const { email, password } = req.body

    const user = await Users.findOne({ where: {email: email} })

    if (!user) {
        res.json({ error: "User dosen't exist" })
    } else {
        bcrypt.compare(password, user.password).then((match) => {
            if (!match) {
                res.json({ error: "Wrong email or password" })
            } else {

                const accessToken = createTokens(user)
                res.cookie("access-token", accessToken, {
                    maxAge: 1000*60*60*24*7,
                    httpOnly: true
                })
                res.json(user)
            }       
        })
    }   
})

router.put("/user", validateToken, async (req, res) => {
    // Dok napravimo zahtjev putem APIja šaljemo body objekt s podacima
    const { name, surname, username, email, id } = req.body

    const user = await Users.findOne({ where: { id: id }})
    const userUsername = await Users.findOne({ where: { username: username }})
    const userEmail = await Users.findOne({ where: { email: email }})
    if (user.email == email && user.username == username && user.name == name && user.surname == surname) {
        res.json("No changes")
    } else if (user.email == email && user.username == username) {
        await Users.update({ name: name, surname: surname}, { where: { id: id }})
        const userUpdate = await Users.findOne({ where: { id: id }})
        const accessToken = createTokens(userUpdate)
        res.cookie("access-token", accessToken, {
            maxAge: 1000*60*60*24*7,
            httpOnly: true
        })
        res.json({ success: "Successfully changed data" })
    } else if (!userUsername && !userEmail) {
        await Users.update({ username: username, email: email }, { where: { id: id }})
        const userUpdate = await Users.findOne({ where: { id: id }})
        const accessToken = createTokens(userUpdate)
        res.cookie("access-token", accessToken, {
            maxAge: 1000*60*60*24*7,
            httpOnly: true
        })
        res.json({ success: "Successfully changed data" })
    } else if (!userUsername && user.email == email) {
        await Users.update({ username: username }, { where: { id: id }})
        const userUpdate = await Users.findOne({ where: { id: id }})
        const accessToken = createTokens(userUpdate)
        res.cookie("access-token", accessToken, {
            maxAge: 1000*60*60*24*7,
            httpOnly: true
        })
        res.json({ success: "Successfully changed data" })
    } else if (!userEmail && user.username == username) {
        await Users.update({ email: email }, { where: { id: id }})
        const userUpdate = await Users.findOne({ where: { id: id }})
        const accessToken = createTokens(userUpdate)
        res.cookie("access-token", accessToken, {
            maxAge: 1000*60*60*24*7,
            httpOnly: true
        })
        res.json({ success: "Successfully changed data" })
    } else {
        res.json({ error: "User already exist" })
    }
    
})

router.put("/changepassword", validateToken, async (req, res) => {
    const { oldPassword, password } = req.body
    const user = await Users.findOne({ where: { id: req.user.id } })

    bcrypt.compare(oldPassword, user.password).then(async (match) => {
        if (!match) {
            res.json({ error: "Wrong password entered!" })
        } else {
            bcrypt.hash(password, 10).then((hash) => {
                Users.update({ password: hash }, { where: { id: user.id } })
                res.json({ success: "Successfully changed password" })
            })
        }
    })
})

router.get("/logout", validateToken, async (req, res) => {
    res.clearCookie("access-token")
    res.json({ logout: true })
})

router.get("/user", validateToken, (req, res) => {
    const user = req.user
    res.json({ auth: true, user: user })
})

router.post("/forgot-password", async (req, res) => {
    const { email } = req.body
    try {
        const oldUser = await Users.findOne({ where: { email: email }})
        console.log(oldUser)
        if (!oldUser) {
            res.json({ error: "User dosen't exist" })
        } else {
            oldUserPassword = oldUser.password
            const accessToken = createTokenForgotPassword(oldUser, oldUserPassword)
            const link = `http://localhost:3000/reset-password/${oldUser.id}/${accessToken}`
            var transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                  user: process.env.EMAIL,
                  pass: process.env.EMAIL_PASSWORD
                }
              })
              
            var mailOptions = {
                from: process.env.EMAIL,
                to: email,
                subject: 'Edusify - Password Reset',
                text: `
Hi ${oldUser.username},

Click here to reset your password:
${link}

Please don't share this link with anyone, and only use it for Edusfiy.

Thanks,
Team Edusify
`
            }
              
            transporter.sendMail(mailOptions, function(error, info){
                if (error) {
                  console.log(error)
                } else {
                  console.log('Email sent: ' + info.response)
                }
            })
            res.json({ success: "Successfully submited, check your email" })
        }
    } catch (error) {
        console.log(error)
    }
})

router.put("/reset-password/:id/:accessToken", async (req, res) => {
    const { id, accessToken } = req.params
    const oldUser = await Users.findOne({ where: { id: id }})
    if (!oldUser) {
        res.json({ error: "User dosen't exist" })
    } else {
        oldUserPassword = oldUser.password
        try {
            const { password } = req.body
            validateTokenForgotPassword(accessToken, oldUserPassword)
            bcrypt.hash(password, 10).then((hash) => {
                Users.update(
                    { password: hash },
                    { where: { id: id } }
                ).then(() => {
                    res.json({ success: "Successfully changed password" })
                }).catch(() => {
                    res.json({ error: "Invalid input" })
                })
            })
        } catch (err) {
            res.json({ error: "Invalid password change request" })
        }
    }
})

module.exports = router