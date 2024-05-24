const express = require("express");

const app = express();
const cors = require("cors");
const cookieParser = require("cookie-parser");

const maxRequestBodySize = "50mb";
app.use(express.json({ limit: maxRequestBodySize }));
corsOptions = {
  origin: "http://localhost:3000",
  credentials: true,
};
app.use(express.urlencoded({ limit: maxRequestBodySize }));

app.use(cors(corsOptions));
app.use(cookieParser());

const db = require("./models");

const userRouter = require("./routes/Users");

app.use("/auth", userRouter);

const projectRouter = require("./routes/Projects");
app.use("/projects", projectRouter);

db.sequelize.sync().then(() => {
  app.listen(3001, () => {
    console.log("Server running on port 3001");
  });
});
