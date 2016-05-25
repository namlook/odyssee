
export default function jsonAPIErrorResponse(plugin) {
  plugin.ext('onPreResponse', (request, reply) => {
    const response = request.response;
    if (response.isBoom) {
      const { payload, statusCode } = response.output;
      const error = {
        statusCode,
        title: payload.error,
      };

      if (payload.message) {
        error.detail = payload.message;
      }

      if (payload.infos) {
        error.meta = { infos: payload.infos };
      }

      response.output.payload = { errors: [error] };
      response.output.headers['content-type'] = 'application/vnd.api+json; charset=utf-8';
    }
    return reply.continue();
  });
}
