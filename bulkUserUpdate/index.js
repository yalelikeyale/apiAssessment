'use strict';

const axios = require('axios');
const csv = require('csvtojson');

// set environment variables
require('dotenv').config();



const genBulkUpdate = async (users) => {
	const axiosConfig = {
		url:'https://api.iterable.com/api/users/bulkUpdate',
		method:'post',
		headers:{
			'Api-Key':process.env.API_KEY
		},
		data:{
			"users":users
		}
	}
	//axios(axiosConfig).then(response=>{
		//if failures write to CSV with timestamp
		//else return success
	//})
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
		const pathName = process.env.PATH_NAME
		const users = await processInput(pathName);
		genBulkUpdate(users)		
	} catch (err) {
		console.log(err);
	}

}


if (require.main === module) {
  startJob().catch(err => console.error(err));
};







