public class RegexTest {
    public static void main(String[] args) {
        String s = "ক. 'কাকতাড়ুয়া' গল্পটি কে লিখেছেন?";
        String res = s.replaceFirst("^\\s*(?:[\\d০-৯]+|[a-zA-Zক-ষ])\\s*[\\.\\)\\-:]\\s*", "");
        System.out.println("Result: " + res);
    }
}
