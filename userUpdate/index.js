'use strict';

const axios = require('axios');
const csv = require('csvtojson');
const Bottleneck = require('bottleneck');

// set environment variables
require('dotenv').config();

const limiter = new Bottleneck({
	minTime:100,
	maxConcurrent:1
})

const processInput = async (pathName) => {
	try {
		const usersArray = await csv().fromFile(pathName);
		if(usersArray){
			return usersArray
		} else {
			throw new Error('No Data to Process')
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
const throttledUserUpdate = limiter.wrap(genRequestPromise);

const executeUserUpdateQueue = async (users) => {
	const userUpdateQueue = users.map(user=>{
		return throttledUserUpdate(user)
	})
	try{
		const results = Promise.all(userUpdateQueue)
		if(results){
			return results
		} else {
			throw new Error('No Results');
		}
	} catch(err) {
		throw err
	}
}

const processResults = () => {
	//loop through results and 
		//generate success metrics 
		//save index positions of failures for retry if appropriate
}

const startJob = async () => {
	const pathName = process.env.PATH_NAME;
	try{
		const users = await processInput(pathName);
		const results = await executeUserUpdateQueue(users)
		console.log(results)
		// processResults()
	} catch (err) {
		throw err 
	}

}


if (require.main === module) {
  startJob().catch(err => console.error(err));
};







