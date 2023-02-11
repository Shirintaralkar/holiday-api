const express = require("express");

const {
  getAllHolidays,
  insertOrUpdate,
  getHolidayById,
  deleteHolidayById,
} = require("./crudHolidays");
const bodyParser = require("body-parser");

const app = express();
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);
app.use(
  bodyParser.json({
    type: "*/*",
  })
);

const typeMap = new Map();
typeMap.set("F", "Fixed");
typeMap.set("O", "Optional");

const locationMap = new Map();
locationMap.set("ALL", "All Locations");
locationMap.set("USA", "Bettendorf, IA");
locationMap.set("IND", "India");

const getKeyFrom = (map, value) => {
  let iterator = map.entries();
  let result = iterator.next().value;
  while (result) {
    if (result[1] == value) {
      return result[0];
    }
    result = iterator.next().value;
  }
};

app.use((err, req, response, next) => {
  if (err.name == "SyntaxError") {
    response.status(400);
    response.json(getErrorResponse("Required data in JSON format only!", 400));
  }
  console.log(err);
  next();
});

const connectionError = "Unable to connect to database!";
const mapToValues = (holiday) => {
  holiday.type = typeMap.get(holiday.type);
  holiday.location = locationMap.get(holiday.location);
  return holiday;
};

app.get("/holiday/year/:year", (req, res) => {
  let year = req.params.year;
  getAllHolidays(year, (error, result) => {
    if (error) {
      return res.status(500).send(getErrorResponse(error, 500, result));
    }
    result.forEach((holiday) => {
      holiday = mapToValues(holiday);
    });
    if (result.length == 0) {
      return res
        .status(404)
        .send(
          getErrorResponse(
            `No record found for the selected year: ${year}`,
            404,
            result
          )
        );
    }
    res
      .status(200)
      .send(
        getResponse(
          `Holiday record found for the selected year: ${year}`,
          200,
          result
        )
      );
  });
});

app.get("/holiday/:id", (req, res) => {
  const id = req.params.id;
  getHolidayById(id, (error, result) => {
    if (error) {
      return res.status(404).send(getErrorResponse(error, 404, result));
    }
    result = mapToValues(result);
    res
      .status(200)
      .send(
        getResponse(`Holiday found successfully by id: ${id}`, 200, result)
      );
  });
});

const getErrorResponse = (message, status, result) => {
  if (message == connectionError) {
    message = connectionError;
    status = 500;
  }
  let response = {
    errorMessage: message,
    status: status,
    holidays: result,
  };
  return response;
};

const getResponse = (message, status, result) => {
  let response = {
    successMessage: message,
    status: status,
    holidays: result,
  };
  return response;
};

app.delete("/holiday/:id", (req, res) => {
  const id = req.params.id;
  deleteHolidayById(id, (error) => {
    if (error) {
      return res.status(404).send(getErrorResponse(error, 404));
    }
    res
      .status(200)
      .send(getResponse(`Holiday deleted successfully by id: ${id}`, 200));
  });
});

const createOrUpdate = (req, res) => {
  if (
    !req.body.location ||
    !req.body.type ||
    req.body.location == "" ||
    req.body.holiday == "" ||
    req.body.type == "" ||
    req.body.description.trim() == ""
  ) {
    return res
      .status(400)
      .send(getErrorResponse("All fields are required", 400, req.body));
  }
  let type = getKeyFrom(typeMap, req.body.type);
  if (!type) {
    return res
      .status(400)
      .send(
        getErrorResponse("Please provide valid holiday type", 400, req.body)
      );
  }
  let location = getKeyFrom(locationMap, req.body.location);
  if (!location) {
    return res
      .status(400)
      .send(
        getErrorResponse("Please provide valid holiday location", 400, req.body)
      );
  }
  req.body.type = type;
  req.body.location = location;

  insertOrUpdate(req.body, (errorMsg, result, status) => {
    if (result) {
      return res
        .status(status.code)
        .send(getResponse(status.message, status.code, mapToValues(result)));
    } else {
      return res
        .status(400)
        .send(getErrorResponse(errorMsg, 400, mapToValues(req.body)));
    }
  });
};

app.post("/holiday", (req, res) => {
  req.body.id = undefined;
  createOrUpdate(req, res);
});

app.put("/holiday/:id", (req, res) => {
  const id = req.params.id;
  req.body.id = id;
  createOrUpdate(req, res);
});

app.get("*", function (req, res) {
  res.status(404).send(getErrorResponse("Resource not found", 404));
});

app
  .listen(3000, () => {
    console.log("Server is up on port 3000.");
  })
  .on("error", function (err) {
    if (err.code == "EADDRINUSE") {
      console.log("Server port 3000 already in use.");
    } else {
      console.log(err);
    }
  });
