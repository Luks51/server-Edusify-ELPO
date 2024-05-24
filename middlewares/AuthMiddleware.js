require('dotenv').config()

const { sign, verify } = require("jsonwebtoken")

const createTokens = (user) => {
    const accessToken = sign({ email: user.email, id: user.id, name: user.name, surname: user.surname, username: user.username}, 
        `${process.env.ACCESS_TOKEN_SECRET}`)

    return accessToken
}

const createTokenForgotPassword = (user, oldUserPassword) => {
    secret = process.env.ACCESS_TOKEN_SECRET + oldUserPassword
    const accessToken = sign({ email: user.email, id: user.id}, 
        `${secret}`, { expiresIn: "5m" })

    return accessToken
}

const validateToken = (req, res, next) => {
    const accessToken = req.cookies["access-token"]

    if (!accessToken)
        return res.json({ error: "User not Authenticated!" })

    try {
        const validToken = verify(accessToken, `${process.env.ACCESS_TOKEN_SECRET}`)
        req.user = validToken
        if (validToken) {
            req.authenticated = true
            return next()
        }
    } catch(err) {
        return res.status(400).json({ error: err })
    }
}

const validateTokenForgotPassword = (accessToken, oldUserPassword) => {
    const secret = process.env.ACCESS_TOKEN_SECRET + oldUserPassword
    const validForgotPasswordToken = verify(accessToken, secret)
    return validForgotPasswordToken
}

module.exports = { createTokens, validateToken, createTokenForgotPassword, validateTokenForgotPassword }