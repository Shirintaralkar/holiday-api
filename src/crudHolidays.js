var uniqid = require("uniqid");
var mysql = require("mysql");

const getConnection = (handleDisconnect, callback) => {
  var connection = mysql.createConnection({
    host: "10.0.5.39",
    user: "sqluser",
    password: "(zcg2-c3f36S1",
    database: "holidays",
  });
  connection.connect((err) => {
    if (err) {
      console.log('########## >>>>> ' + err)
      return handleDisconnect("Unable to connect to database!", null);
    }
    connection.on("error", (err) => {
      if (err.code == "PROTOCOL_CONNECTION_LOST") {
        console.log("Unable to connect to database!");
      }
    });
    callback(connection);
  });
};

const insertOrUpdate = (holiday, callback) => {
  let sql =
    "INSERT INTO ETT_HOLIDAY (ORG_CD, LOC_CD, HOLIDAY_TYPE, HOLIDAY_DESC, HOLIDAY, CRT_BY_TS, UPD_BY_TS, CRT_BY_USER, UPD_BY_USER, HOLIDAY_ID)" +
    " VALUES (?, ?, ?, ?, ?, now(), now(), ?, ?, ?)";
  let id = uniqid();

  if (holiday.id) {
    id = holiday.id;
    sql =
      "UPDATE ETT_HOLIDAY SET ORG_CD=?, LOC_CD=?, HOLIDAY_TYPE=?, HOLIDAY_DESC=?, HOLIDAY=?, CRT_BY_TS= now(), UPD_BY_TS= now(), CRT_BY_USER=?, UPD_BY_USER=? WHERE HOLIDAY_ID=?";
  }

  getConnection(callback, (connection) => {
    connection.query(
      sql,
      [
        "CBP",
        holiday.location,
        holiday.type,
        holiday.description,
        holiday.holiday,
        "sTaralkar",
        "sTaralkar",
        id,
      ],
      (error, results) => {
        if (error) {
          if (error.code == "ER_DUP_ENTRY") {
            return callback("Holiday already exists!", undefined);
          }
          if (error.code == "ER_TRUNCATED_WRONG_VALUE") {
            return callback("Invalid date!", undefined);
          }
          return callback(error, undefined);
        }
        let status = {
          message: "Holiday created successfully",
          code: 201
        }
        if (holiday.id) {
          status.message = "Holiday updated successfully";
          status.code = 200;
        }
        holiday.id = id;
        return callback(undefined, holiday, status);
      }
    );
  });
};

const getAllHolidays = (year, callback) => {
  getConnection(callback, (connection) => {
    connection.query(
      'SELECT LOC_CD, HOLIDAY_TYPE, HOLIDAY_DESC, DATE_FORMAT(HOLIDAY, "%Y-%m-%d") as HOLIDAY, HOLIDAY_ID FROM ETT_HOLIDAY WHERE year(HOLIDAY)=? ORDER BY HOLIDAY', 
      [year],
      (err, result) => {
        if (err) {
          return callback(err, null);
        }
        let holidays = [];

        result.forEach((row) => {
          let holiday = {};
          holiday.location = row.LOC_CD;
          holiday.type = row.HOLIDAY_TYPE;
          holiday.description = row.HOLIDAY_DESC;
          holiday.holiday = row.HOLIDAY;
          holiday.id = row.HOLIDAY_ID;
          holidays.push(holiday);
        });
        callback(undefined, holidays);
      }
    );
  });
};

const deleteHolidayById = (id, callback) => {
  getConnection(callback, (connection) => {
    connection.query(
      "DELETE FROM ETT_HOLIDAY WHERE HOLIDAY_ID =?",
      [id],
      (error, result) => {
        {
          if (error) {
            return callback("Unable to find holiday");
          }
          callback(undefined);
        }
      }
    );
  });
};

const getHolidayById = (id, callback) => {
  getConnection(callback, (connection) => {
    connection.query(
      'SELECT LOC_CD, HOLIDAY_TYPE, HOLIDAY_DESC, DATE_FORMAT(HOLIDAY, "%Y-%m-%d") as HOLIDAY, HOLIDAY_ID FROM ETT_HOLIDAY WHERE HOLIDAY_ID =?',
      [id],
      (error, result) => {
        {
          if (error || !result[0]) {
            return callback("Unable to find holiday", undefined);
          }
          let holiday = {};
          holiday.location = result[0].LOC_CD;
          holiday.type = result[0].HOLIDAY_TYPE;
          holiday.description = result[0].HOLIDAY_DESC;
          holiday.holiday = result[0].HOLIDAY;
          holiday.id = result[0].HOLIDAY_ID;
          callback(undefined, holiday);
        }
      }
    );
  });
};

module.exports = {
  getAllHolidays,
  insertOrUpdate,
  getHolidayById,
  deleteHolidayById,
};
