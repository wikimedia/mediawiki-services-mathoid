This directory contains files for manually testing Mathoid
in RESTbase, as follows:

First, clone RESTbase from https://github.com/wikimedia/restbase

Copy the config.yaml file from the test/restbase directory in the Mathoid repo
to the root directory of the RESTbase repo.

Depending on your Mathoid setup, you may have to adjust the host setting in the
spec for the math endpoints, which is set to `https://localhost:10044` per default.
If you are running mathoid in a docker container, change "localhost"
to the name of the relevant container (e.g. "mathoid"), and remember to expose
the relevant port on that container.
You can also test against the mathoid instance running on wmflabs.
To do that, set the host to `https://mathoid.beta.math.wmflabs.org`.

Note: if you change the host, you may have to also adjust the pattern in the 
`x-sub-request-filters` section at the top of the file!

In order to run restbase, start a docker container based on the official node.js
image. Running npm directly on the host is insecure. NPM packages can't
generally be trusted to be safe to run locally under your own user account. 

To start the docker container, run the following command in the directory
that contains restbase:
```
> docker run --rm -it \
    -p 7231:7231 \
    -v "$(pwd):/usr/src/project" \
    --workdir /usr/src/project \
    --name restbase-dev \
    node:12 bash
```

This will drop you on a bash prompt inside the container. Now you can run npm commands
as needed:

```
$ npm install 
$ npm start
```

You only have to run npm install once, it is not needed next time you start the
container.

After running `npm start`, you should see output from restbase, starting with something like
```
| restbase@1.1.4 start /usr/src/project
| service-runner
```

You can now contact RESTbase under http://localhost:7231/localhost/v1/.
This URL should show the Swagger UI describing the math endpoints.

You can use CURL to send requests to the math endpoints, e.g.:
```
> curl -X 'POST' 'http://localhost:7231/localhost/v1/media/math/check/tex' \
    -H 'Cache-Control: no-cache' \
    -H 'Content-Type: multipart/form-data' \
    -F q=x_1
```

You should get a response that looks like this:
```
{"success":true,"checked":"x_{1}","requiredPackages":[],"identifiers":["x_{1}"],"endsWithDot":false}1
```
