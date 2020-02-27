'use strict';

const axios = require('axios');
const Bottleneck = require('bottleneck');
const csv = require('csvtojson');

// set environment variables
require('dotenv').config();
const pathName = process.env.PATH_NAME
const apiKey = process.env.API_KEY



const genBulkUpdate = async (users) => {
	const axiosConfig = {
		url:'',
		method:'post',
		data:{
			"users":users
		}
	}
	//axios(axiosConfig)
	//grab response and if failures grab and reprocess
}


const payloadGenerator = async (usersArray) => {
	const usersPayload = [];
	usersArray.forEach(user=>{
		const email = user.email;
		delete user.email;
		const userPayload = {
			'email':email,
			'preferUserId':false,
			'mergeNestedObjects':false,
			'dataFields': user
		};
		usersPayload.push(userPayload);
	})
	return usersPayload
}


const processInput = async (pathName) => {
	try {
		const usersArray = await csv().fromFile(pathName);
		const usersPayload = await payloadGenerator(usersArray);
		if(usersPayload){
			return usersPayload
		} else {
			return new Error('No Data to Submit')
		}
	} catch (err) {
		console.log(err);
	}
}

const startJob = async () => {
	try{
		const users = await processInput(pathName);
		genBulkUpdate(users)		
	} catch (err) {
		console.log(err);
	}

}


if (require.main === module) {
  startJob().catch(err => console.error(err));
};







