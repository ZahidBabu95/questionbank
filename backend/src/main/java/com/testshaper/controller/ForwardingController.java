package com.testshaper.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * Controller to handle Single Page Application (SPA) routing.
 * Forwards any GET request that is not an API call or a static file to index.html.
 * IMPORTANT: Only handles GET requests — POST/PUT/DELETE must not be forwarded.
 */
@Controller
public class ForwardingController {

    @GetMapping(value = { "/{path:[^\\.]*}", "/*/{path:[^\\.]*}", "/*/*/{path:[^\\.]*}", "/*/*/*/{path:[^\\.]*}" })
    public String forward() {
        return "forward:/index.html";
    }
}
