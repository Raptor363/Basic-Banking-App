const express = require('express');
const app = express();
const path = require('path');
const bodyParser = require('body-parser');
const mongoose = require("mongoose");
const session = require("express-session");
const flash = require("connect-flash");
const dotenv = require('dotenv');
dotenv.config();
const url = process.env.MONGOLAB_URI;

const port = process.env.PORT || 3000;

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static(__dirname + "/public"));

mongoose.connect(url, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false
    })
.then(() => console.log('Connected to DB!'))
.catch(error => console.log(error.message));

app.use(require("express-session")({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false
}));

app.use(flash());

app.use(function(req, res, next){
    // res.locals.currentUser = req.user;
    res.locals.error = req.flash("error");
    res.locals.success = req.flash("success");
    next();
});

const customerSchema = new mongoose.Schema({
    name: String,
    mailID: String,
    balance: Number
});

const transferSchema = new mongoose.Schema({
    sender: String,
    receiver: String,
    amount: Number
});

// console.log(url);
const Customer = mongoose.model("Customer", customerSchema);

const Transaction = mongoose.model("Transaction", transferSchema);

// Customer.insertMany([
//     {
//         name: "Patrick",
//         mailID: "patrick@gmail.com",
//         balance: 10000
//     },
//     {
//         name: "Ania",
//         mailID: "ania@gmail.com",
//         balance: 12500
//     },
//     {
//         name: "Dennis",
//         mailID: "dennis@gmail.com",
//         balance: 30000
//     },
//     {
//         name: "Terry",
//         mailID: "terry@gmail.com",
//         balance: 8000
//     },
//     {
//         name: "Winter",
//         mailID: "winter@gmail.com",
//         balance: 40700
//     },
//     {
//         name: "Mina",
//         mailID: "mina@gmail.com",
//         balance: 7000
//     },
//     {
//         name: "Chris",
//         mailID: "chris@gmail.com",
//         balance: 50000
        
//     },
//     {
//         name: "Felix",
//         mailID: "felix@gmail.com",
//         balance: 25000
//     },
//     {
//         name: "Maria",
//         mailID: "maria@gmail.com",
//         balance: 3500
//     },
//     {
//         name: "Jack",
//         mailID: "jack@gmail.com",
//         balance: 5500
//     },
// ]);

// Transaction.insertMany([
//     {
//         sender: "Felix",
//         receiver: "Chris",
//         amount: "500"
//     },
//     {
//         sender: "Ania",
//         receiver: "Jack",
//         amount: 500
//     }
// ]);

app.get('/', (req, res) => {
    Customer.find({}, function(err){
        if(err){
            console.log(err);
        }else{
            res.render("index");
        }
    });
});

app.get('/customers', (req, res) => {
    Customer.find({}, function(err, customers){
        if(err){
            console.log(err);
        }else{
            res.render("customers", {customers: customers});
        }
    });
})

app.get('/transaction', (req, res) => {
    const sender = (req.query.sender);
    const senderName = sender.split(",", 1);
    const i = sender.indexOf(":");
    const senderBal = Number(sender.substr(i+1));
    Customer.find({}, function(err, customers){
        if(err){
            console.log(err);
        } else {
            res.render("transaction", {customers: customers, sender: senderName, senderBal: senderBal});
        }
    })
});

app.post("/history", (req, res) => {
    const amount = Number(req.body.amount);
    const sender = req.body.sender;
    const i = sender.indexOf(" ");
    const senderBal = Number(sender.substr(i+1)) - amount;
    console.log(senderBal);
    // console.log(amount, senderName, senderBal, receiverName, receiverBal);
    if(amount > senderBal){
        req.flash("error", "Transaction Failed! Not enough balance.");
        return res.redirect("/customers");
    }
    const senderName = sender.split(" ", 1)[0];
    const receiver = req.body.receiver;
    const receiverName = receiver.split("," , 1)[0];
    const j = receiver.indexOf(":");
    const receiverBal = Number(receiver.substr(j+1)) + amount
    const history = {sender: senderName, receiver: receiverName, amount: amount};

    Customer.findOneAndUpdate({"name": senderName},{"balance": senderBal}, {upsert: true}, function(err, doc) {
        if (err) return res.send(500, {error: err});
        console.log("Save!");
    });
    Customer.findOneAndUpdate({"name": receiverName}, {"balance": receiverBal}, {upsert: true}, function(err, doc) {
        if (err) return res.send(500, {error: err});
        console.log("Save!");
    });
    console.log(senderName, senderBal, receiverName, receiverBal);
    Transaction.create(history, function(err, transaction){
        if(err){
            return res.redirect("/customers");
        }
        Transaction.find({}, function(err, transactions){
            if(err){
                res.redirect("/customers");
            } else {
                req.flash("success", "Transaction Successful!");
                res.redirect("/");
            }
        })
        
    })
});

app.get("/history", function(req, res){
    Transaction.find({}, function(err, transactions){
        if(err){
            return res.redirect("/transaction");
        }
        res.render("history", {transactions: transactions});
    })
});

app.listen(port, () => {
    console.log(`App is listening on port ${port}`);
})