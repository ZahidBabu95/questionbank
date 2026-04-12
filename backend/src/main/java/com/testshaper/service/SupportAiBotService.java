package com.testshaper.service;

import com.testshaper.entity.SupportTicket;

public interface SupportAiBotService {
    void processNewTicket(SupportTicket ticket, String initialMessage);
}
