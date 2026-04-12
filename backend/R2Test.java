import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

public class R2Test {
    public static void main(String[] args) throws Exception {
        String accountId = System.getenv("R2_ACCOUNT_ID");
        if (accountId == null) accountId = "test";
        String url = "https://" + accountId + ".r2.cloudflarestorage.com";
        System.out.println("Testing TLS to: " + url);
        HttpClient client = HttpClient.newHttpClient();
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .GET()
                .build();
        try {
            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
            System.out.println("Status: " + response.statusCode());
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
