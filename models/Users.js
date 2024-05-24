module.exports = (sequelize, DataTypes) => {
    const Users = sequelize.define("Users", {
        name: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                isAlpha: true,
                len: [1,30]
            }
        },
        surname: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                isAlpha: true,
                len: [1,50]
            }
        },
        username: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                len: [4,25]
            }
        },
        email: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                isEmail: true,
                len: [5,50]
            }
        },
        password: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        uapp: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
        }
    })

    Users.associate = (models) => {
        Users.hasMany(models.Projects, {
            onDelete: "cascade"
        })
    }

    return Users
}