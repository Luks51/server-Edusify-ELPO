module.exports = (sequelize, DataTypes) => {
    const Projects = sequelize.define("Projects", {
        visible: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        photo: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        content: {
            type: DataTypes.TEXT('long'),
            allowNull: false,
        },
        title: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                len: [3,25]
            }
        },
        description: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                len: [4,100]
            }
        }  
    })

    Projects.associate = (models) => {
        Projects.belongsTo(models.Users)
    }

    return Projects
}