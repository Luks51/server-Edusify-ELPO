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
                res.json({ error: "Korisnik već postoji" });
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
                        res.json("Uspješno")
                      }).catch(() => {
                        res.json({ error: "Neispravan unos" })
                      })
                    
                })
            } else {
                res.json({ error: "Morate prihvatiti Uvjete korištenja i Pravila privatnosti" })
            }
        } else {
            res.json({ error: "Morate popuniti sva obavezna polja" })
        }
})

router.post("/login", async (req, res) => {
    const { email, password } = req.body

    const user = await Users.findOne({ where: {email: email} })

    if (!user) {
        res.json({ error: "Korisnik ne postoji" })
    } else {
        bcrypt.compare(password, user.password).then((match) => {
            if (!match) {
                res.json({ error: "Neispravna email adresa ili lozinka" })
            } else {

                const accessToken = createTokens(user)
                res.cookie("access-token", accessToken, {
                    maxAge: 1000*60*60*24*7,
                    httpOnly: true,
                    sameSite: 'none',
                    secure: true
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
        res.json("Nema promjene")
    } else if (user.email == email && user.username == username) {
        await Users.update({ name: name, surname: surname}, { where: { id: id }})
        const userUpdate = await Users.findOne({ where: { id: id }})
        const accessToken = createTokens(userUpdate)
        res.cookie("access-token", accessToken, {
            maxAge: 1000*60*60*24*7,
            httpOnly: true,
            sameSite: 'none',
            secure: true
        })
        res.json({ success: "Uspješno promijenjeni podaci" })
    } else if (!userUsername && !userEmail) {
        await Users.update({ username: username, email: email }, { where: { id: id }})
        const userUpdate = await Users.findOne({ where: { id: id }})
        const accessToken = createTokens(userUpdate)
        res.cookie("access-token", accessToken, {
            maxAge: 1000*60*60*24*7,
            httpOnly: true,
            sameSite: 'none',
            secure: true
        })
        res.json({ success: "Uspješno promijenjeni podaci" })
    } else if (!userUsername && user.email == email) {
        await Users.update({ username: username }, { where: { id: id }})
        const userUpdate = await Users.findOne({ where: { id: id }})
        const accessToken = createTokens(userUpdate)
        res.cookie("access-token", accessToken, {
            maxAge: 1000*60*60*24*7,
            httpOnly: true,
            sameSite: 'none',
            secure: true
        })
        res.json({ success: "Uspješno promijenjeni podaci" })
    } else if (!userEmail && user.username == username) {
        await Users.update({ email: email }, { where: { id: id }})
        const userUpdate = await Users.findOne({ where: { id: id }})
        const accessToken = createTokens(userUpdate)
        res.cookie("access-token", accessToken, {
            maxAge: 1000*60*60*24*7,
            httpOnly: true,
            sameSite: 'none',
            secure: true
        })
        res.json({ success: "Uspješno promijenjeni podaci" })
    } else {
        res.json({ error: "Korisnik već postoji" })
    }
    
})

router.put("/changepassword", validateToken, async (req, res) => {
    const { oldPassword, password } = req.body
    const user = await Users.findOne({ where: { id: req.user.id } })

    bcrypt.compare(oldPassword, user.password).then(async (match) => {
        if (!match) {
            res.json({ error: "Unesena neispravna lozinka!" })
        } else {
            bcrypt.hash(password, 10).then((hash) => {
                Users.update({ password: hash }, { where: { id: user.id } })
                res.json({ success: "Uspješno promijenjena lozinka" })
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
            res.json({ error: "Korisnik ne postoji" })
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
                subject: 'Edusify - Promjena lozinke',
                text: `
Pozdrav ${oldUser.username},

Kliknite ovdje za ponovno postavljanje lozinke:
${link}

Molimo ne dijelite ovu poveznicu ni s kim i koristite je samo za Edusfiy.

Hvala.
Tim Edusify
`
            }
              
            transporter.sendMail(mailOptions, function(error, info){
                if (error) {
                  console.log(error)
                } else {
                  console.log('Email poslan: ' + info.response)
                }
            })
            res.json({ success: "Uspješno poslano, provjerite svoju email adresu" })
        }
    } catch (error) {
        console.log(error)
    }
})

router.put("/reset-password/:id/:accessToken", async (req, res) => {
    const { id, accessToken } = req.params
    const oldUser = await Users.findOne({ where: { id: id }})
    if (!oldUser) {
        res.json({ error: "Korisnik ne postoji" })
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
                    res.json({ success: "Uspješno promijenjena lozinka" })
                }).catch(() => {
                    res.json({ error: "Neispravan unos" })
                })
            })
        } catch (err) {
            res.json({ error: "Neispravan zahtjev za promjenu lozinke" })
        }
    }
})

module.exports = router