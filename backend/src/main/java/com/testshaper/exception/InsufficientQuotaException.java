package com.testshaper.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.PAYMENT_REQUIRED)
public class InsufficientQuotaException extends RuntimeException {
    public InsufficientQuotaException(String message) {
        super(message);
    }
}
