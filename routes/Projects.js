const express = require("express")
const router = express.Router()
const { Projects, Users } = require("../models")
const { Op } = require("sequelize")

const { validateToken } = require("../middlewares/AuthMiddleware")

Users.hasMany(Projects)

router.post("/", async (req, res) => {
    const loaded = req.body.loaded
    const listOfProjects = await Projects.findAndCountAll({
        include: [Users],
        order: [["updatedAt", "DESC"]],
        limit: 24,
        offset: loaded,
        where: { visible: "1" }
    })
    res.json(listOfProjects)
})

router.get("/byId/:id", validateToken, async (req, res) => {
    const userid = req.user.id
    const id = req.params.id
    const project = await Projects.findOne({
        include: [Users],
        where: { id: id }
    })
    if (project) {
        if (project.visible == "1") {
            res.json(project)
        } else if(project.UserId == userid) {
            res.json(project)
        } else {
            res.json({ error: "The project either doesn't exist or has been deleted" })
        }
    } else {
        res.json({ error: "The project either doesn't exist or has been deleted" })
    }
})

router.post("/byUsername/:username", validateToken, async (req, res) => {
    const username = req.params.username
    const loaded = req.body.loaded
    const user = await Users.findOne({ where: { username: username } })
    if (user) {
        const listOfProjects = await Projects.findAndCountAll({
            order: [["updatedAt", "DESC"]],
            limit: 24,
            offset: loaded,
            where: { 
                [Op.and]: [
                { UserId: user.id },
                { visible: "1" }
              ]}
            })
        if (user) {
            res.json(listOfProjects)
        } else {
            res.json({ error: "The user doesn't exist" })
        }
    } else {
        res.json({ error: "The user doesn't exist" })
    }
    
})

router.post("/my", validateToken, async (req, res) => {
    const loaded = req.body.loaded
    const listOfProjects = await Projects.findAndCountAll({
        order: [["updatedAt", "DESC"]],
        limit: 24,
        offset: loaded,
        where: { UserId: req.user.id }
    })
    res.json(listOfProjects)
})

router.post("/search/:query", async (req, res) => {
    const query = req.params.query
    const loaded = req.body.loaded
    const listOfProjects = await Projects.findAndCountAll({
        include: [Users],
        order: [["updatedAt", "DESC"]],
        limit: 24,
        offset: loaded,
        where: { 
            [Op.or]: [
            { title: { [Op.like]: '%' + query + '%'} },
            { description: { [Op.like]: '%' + query + '%'} },
            { content: { [Op.like]: '%' + query + '%'} }
          ]}
    })
    res.json(listOfProjects)
})

router.post("/create", validateToken, async (req, res) => {
    const project = req.body;
    let data = await Projects.create(project)
    res.json(data)
})

router.put("/update", validateToken, async (req, res) => {
    const project = req.body;
    await Projects.update(project, { where: { id: project.id }})
    const newProject = await Projects.findOne({ where: { id: project.id } })
    res.json(newProject)
})

router.delete("/delete/:projectId", validateToken, async (req, res) => {
    const projectId = req.params.projectId
    await Projects.destroy({
        where: { id: projectId }
    })
    res.json({ deleted: true })
})

module.exports = router