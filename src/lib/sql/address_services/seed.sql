INSERT INTO address_services (name, config_json, is_default) VALUES
('Default Address Provider', '{
  "request": {
    "api_config": {
      "notes": [
        "Esta es una API mixta (restcountries y countriesnow) para obtener paso a paso una dirección a partir de la selección secuencial",
        "Límite aproximado - restcountries.com:  1000 consultas/hora por IP",
        "Límite aproximado - countriesnow.space",
        "$continent: es el continente seleccionado de la lista de continentes.",
        "$country: es el nombre del pais seleccionado de la lista de paises."
      ],
      "parameters": {
        "continents": {
          "value": [
            "Africa",
            "Americas",
            "Asia",
            "Europe",
            "Oceania"
          ],
          "description": "Lista de continentes hardcode para esta configuración."
        },
        "countries": {
          "url": "https://restcountries.com/v3.1/region/$continent?fields=name,cca2,flag",
          "method": "GET",
          "headers": {},
          "body": {},
          "description": "Lista de los países del continente seleccionado."
        },
        "states": {
          "url": "https://countriesnow.space/api/v0.1/countries/states",
          "method": "POST",
          "headers": {
            "Content-Type": "application/json"
          },
          "body": {
            "country": "$country"
          },
          "description": "Lista de estados del país seleccionado."
        },
        "cities": {
          "url": "https://countriesnow.space/api/v0.1/countries/state/cities",
          "method": "POST",
          "headers": {
            "Content-Type": "application/json"
          },
          "body": {
            "country": "$country",
            "state": "$state"
          },
          "description": "Lista de ciudades del país y estado seleccionado."
        }
      }
    }
  },
  "response": {
    "continents": {
      "path": "request.api_config.parameters.continents.value"
    },
    "countries": {
      "path": ".",
      "name": "name.common",
      "cca2": "cca2",
      "flag": "flag"
    },
    "states": {
        "path": "data.states",
        "name": "name"
    },
    "cities": {
      "path": "data"
    }
  }
}', TRUE)
ON CONFLICT (name) DO NOTHING;

    