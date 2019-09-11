CREATE DATABASE phones; 

CREATE TABLE phones(
   phone_id serial PRIMARY KEY,
   phone VARCHAR (15) UNIQUE NOT NULL,
   viber BOOLEAN,
   telegram BOOLEAN,
   whatsapp BOOLEAN,
   valid BOOLEAN
);
