import { verifyGithubUser } from "./github.js";
import { getLogger } from "@logtape/logtape";

const logger = getLogger(["mcpserver", "token-middleware"]);

// Funzione di autenticazione per HttpSseTransport
// Ispirata al middleware requireBearerAuth dell'SDK MCP
export const tokenMiddleware = async (
  req: any,
): Promise<Record<string, unknown> | undefined> => {
  try {
    logger.debug("[tokenMiddleware] Invocato per richiesta", {
      headers: req.headers,
    });

    // Controllo header Authorization
    const authHeader = req.headers["authorization"];
    if (!authHeader) {
      logger.warn("[tokenMiddleware] Nessun header Authorization presente");
      return undefined; // Nessuna autenticazione
    }

    if (!authHeader.startsWith("Bearer ")) {
      logger.warn("[tokenMiddleware] Header Authorization non è Bearer", {
        authHeader,
      });
      return undefined;
    }

    const token = authHeader.slice(7); // Rimuovi "Bearer "
    logger.debug("[tokenMiddleware] Token estratto", {
      tokenLength: token.length,
    });

    // Verifica membership GitHub
    logger.debug("[tokenMiddleware] Verifica membership GitHub");
    const isMember = await verifyGithubUser(token);
    if (!isMember) {
      logger.warn(
        "[tokenMiddleware] User non è membro delle organizzazioni richieste",
      );
      throw new Error("User is not a member of required organizations");
    }

    logger.debug("[tokenMiddleware] Membership OK, restituisco authInfo");

    // Restituisci AuthInfo per l'SDK MCP
    return {
      token,
      clientId: "mcp-client",
      scopes: ["default"],
      extra: { userId: "github-user" },
    };
  } catch (error) {
    logger.error("[tokenMiddleware] Errore dettagliato", {
      error: (error as Error).message,
      stack: (error as Error).stack,
      name: (error as Error).name,
    });
    throw error;
  }
};
