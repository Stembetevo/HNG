import express from 'express'
import cors from 'cors'

const app = express()

app.use(cors({origin:""}));
app.use((req,res,next) => {
    res.setHeader("Access-Controlled-Allow_Origin"," ");
    next();
});

app.use(express.json());
// app.use("/api")


export default app;