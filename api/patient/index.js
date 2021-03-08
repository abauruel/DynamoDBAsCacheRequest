
const AWS = require('aws-sdk')
const patientRepository = require('./repository/patient')
const examRepository = require('./repository/exam')
const medicineRepository = require('./repository/medicine')

AWS.config.update({
  region: 'us-east-1',
})

const dynamoClient = new AWS.DynamoDB.DocumentClient()
const dynamoPatientsTable = 'patients'

const addPacientToCache = patient => {
  const now = Math.round(new Date().getTime() / 1000)
  const params = {
    TableName: dynamoPatientsTable,
    Item: {...patient, expiresAt: now + 3600 }
  }

  return dynamoClient.put(params).promise()
}

const getPacientToCache = async pacientId => {
  const params= {
    TableName: dynamoPatientsTable,
    Key: {
      id: Number(pacientId)
    }
  }

  return dynamoClient.get(params).promise()
    .then(result => result.Item)
    .catch( e=> {
      console.error(e)
      return
    })
}

const getPatientInfo = async patientId => {
  let patientData = await getPacientToCache(patientId)
  if(patientData){
    return patientData
  }

    const patient = await patientRepository.findById(patientId)
    const exams = await examRepository.findAllByPatientId(patientId)
    const medicines = await medicineRepository.findAllByPatientId(patientId)

   patientData = {
    ...patient.dataValues,
    createdAt: patient.createdAt.toString(),
    updatedAt: patient.updatedAt.toString(),
        exams: exams.map(exam => ({
                name: exam.name,
                result: exam.result,
                date: exam.date.toISOString()
            })
        ),
        medicines: medicines.map(medicine =>({
                name: medicine.name,
                date: medicine.date.toISOString()
            })
        ),
  }
    await addPacientToCache(patientData)

    return patientData


}

module.exports = {
    getPatientInfo
}
