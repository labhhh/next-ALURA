// Arquitetura Hexagonal

import { tokenService } from "../../services/auth/tokenService";

// Ports & Adapters
export async function HttpClient(fetchUrl, fetchOptions) {
  const options = {
    ...fetchOptions,
    headers: {
      'Content-Type': 'application/json',
      ...fetchOptions.headers,
    },
    body: fetchOptions.body ? JSON.stringify(fetchOptions.body) : null,
  };
  return fetch(fetchUrl, options)
    .then(async (respostaDoServidor) => {
      return {
        ok: respostaDoServidor.ok,
        status: respostaDoServidor.status,
        statusText: respostaDoServidor.statusText,
        body: await respostaDoServidor.json(),
      }
    })
    .then(async (response) => {
      //Cancela as tentativas de requisição caso não exista um refresh e caso o status da resposta for 401
      if(!fetchOptions.refresh) return response; 
      if(response.status !== 401) return response;

      //Tenta atualizar os tokens
      const serverResponse = await HttpClient(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/refresh`,{
        method: 'GET'
      });

      const newAccessToken = serverResponse.body.data.access_token;
      const newRefreshToken = serverResponse.body.data.refresh_token;

      //Guarda os tokens
      tokenService.save(newAccessToken);

      //Refaz a requisição passando o novo token
      const retryResponse = await HttpClient(fetchUrl,{
        ...options,
        refresh: false,
        headers:{
          'Authorization': `Beare ${newAccessToken}`
        }
      })

      return retryResponse;
    })
}
