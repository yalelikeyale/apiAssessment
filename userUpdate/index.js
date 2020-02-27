'use strict';

const axios = require('axios');
const csv = require('csvtojson');
const Bottleneck = require('bottleneck');

// set environment variables
require('dotenv').config();



const processInput = async (pathName) => {
	try {
		const usersArray = await csv().fromFile(pathName);
		if(usersArray){
			return usersArray
		} else {
			return new Error('No Data to Process')
		}
	} catch (err) {
		throw err
	}
}

const genRequestPromise = (user) => {
	const email = user.email;
	delete user.email;
	const axiosConfig = {
		url:'https://api.iterable.com/api/users/update',
		method:'post',
		headers:{
			'Api-Key':process.env.API_KEY
		},
		data:{
			'email':email ,
			'preferUserId':false,
			'mergeNestedObjects':false,
			'dataFields':user 
		}
	} 
	return axios(axiosConfig)
}

const genQueue = (users) => {
	const limiter = new Bottleneck({
		minTime:100,
		maxConcurrent:1
	})
	const throttledUserUpdate = limiter.wrap(genRequestPromise);
	const userUpdateQueue = users.map(user=>{
		return throttledUserUpdate(user)
	})
	return userUpdateQueue
}

const startQueue = async (userUpdateQueue) => {
	try {
		const results = await Promise.all(userUpdateQueue);
		return results
	} catch(err){
		throw err 
	}
}

const processResults = (jobResults) => {
	//could grab data and reprocess until no failures
}

const startJob = async () => {
	try{
		const pathName = process.env.PATH_NAME;
		const users = await processInput(pathName);
		const userUpdateQueue = genQueue(users)
		const jobResults = await startQueue(userUpdateQueue)
		processResults(jobResults)
	} catch (err) {
		throw err 
	}

}


if (require.main === module) {
  startJob().catch(err => console.error(err));
};







