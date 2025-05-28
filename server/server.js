const mongoose = require("mongoose");

mongoose.connect('mongodb+srv://root:root@pvimessages.wsrr92m.mongodb.net/?retryWrites=true&w=majority&appName=pvimessages', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});