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
	return axios(axiosConfig);
}


const payloadGenerator = (usersArray) => {
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
		const usersPayload = payloadGenerator(usersArray);
		if(usersPayload){
			return usersPayload
		} else {
			throw new Error('No Data to Submit')
		}
	} catch (err) {
		throw err 
	}
}

const startJob = async () => {
	try{
		const pathName = process.env.PATH_NAME;
		const users = await processInput(pathName);
		const bulkUpdate = genBulkUpdate(users);
		console.log(bulkUpdate)
	} catch (err) {
		throw err 
	}

}


if (require.main === module) {
  startJob().catch(err => console.error(err));
};







