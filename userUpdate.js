'use strict';

const axios = require('axios');
const csv = require('csvtojson');
const Bottleneck = require('bottleneck');
const isEqual = require('lodash.isequal');

// set environment variables
require('dotenv').config();

//limit api requests to 10 per second well within 500 could prob speed up
const limiter = new Bottleneck({
	minTime:100,
	maxConcurrent:1
})

//input validation variables
const emailRE = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
const userKeys = ['firstName','lastName','email','favoriteTomato','totalTomatoOrders','daysSinceLastOrder','zip','phoneNumber','age','streetAddress','city','state','customMessageOne','gender'];

//translate user object to request payload per user update spec
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
//leverage Bottleneck package to rate limit api requests
const throttledUserUpdate = limiter.wrap(genRequestPromise);


const executeUserUpdateQueue = async (users) => {
	//generate array of axios request promises
	const userUpdateQueue = users.map(user=>{
		return throttledUserUpdate(user)
	})
	try{
		//Execute rate limited promise queue
		const results = await Promise.all(userUpdateQueue)
		if(results){
			return results
		} else {
			throw new Error('No Results');
		}
	} catch(err) {
		throw err
	}
}

const cleanUserData = (user) => {
	try {
		if(isEqual(Object.keys(user),userKeys)){
			return {
			    firstName: user.firstName.trim() ? user.firstName.trim() : null,
			    lastName: user.lastName.trim() ? user.lastName.trim() : null,
			    email: emailRE.test(user.email) ? user.email : null,
			    favoriteTomato: user.favoriteTomato ? user.favoriteTomato.trim() : null,
			    totalTomatoOrders: parseInt(user.totalTomatoOrders) || null,
			    daysSinceLastOrder: parseInt(user.daysSinceLastOrder) || null,
			    zip: user.zip.length == 5? parseInt(user.zip) : null || null,
			    phoneNumber: user.phoneNumber.trim() ? user.phoneNumber : null,
			    age: parseInt(user.age) || null,
			    streetAddress: user.streetAddress.trim() ? user.streetAddress : null,
			    city: user.city.trim() ? user.city.trim() : null,
			    state: user.state.trim() ? user.state.trim() : null,
			    customMessageOne: (user.customMessageOne.trim()) && (user.customMessageOne.length <= 1025) ? user.customMessageOne : null,
			    gender: user.gender.trim()? user.gender.trim() : null
			}
		} else {
			throw new Error('Incorrect User Keys')
		}
	} catch (err) {
		throw err
	}
}

const processInput = async (pathName) => {
	try {
		//leverage csvtojson to create array of user objects from CSV
		const usersArray = await csv().fromFile(pathName);

		if(usersArray){
			// pass each user object through data validation function
			const cleanUsers = usersArray.map(user=>{
				return cleanUserData(user);
			})
			// filter for users with a valid email
			const filteredUsers = cleanUsers.filter(user=>user.email)
			if(filteredUsers.length > 0){
				console.log(`${cleanUsers.length - filteredUsers.length} Users dropped from job due to invalid Email`);
				return filteredUsers;
			} else {
				throw new Error('No valid User Emails')
			}
		} else {
			throw new Error('No Data to Process')
		}
	} catch (err) {
		throw err
	}
}


const startJob = async () => {
	const pathName = process.env.PATH_NAME;
	try{
		//read in CSV 
		const users = await processInput(pathName);
		//generate api requests from array of user objects
		const results = await executeUserUpdateQueue(users)
		console.log(results);
		//process results - success metrics + retry
	} catch (err) {
		throw err 
	}

}

//entry point
if (require.main === module) {
  startJob().catch(err => console.error(err));
};







