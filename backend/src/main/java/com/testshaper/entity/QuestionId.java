package com.testshaper.entity;

import java.io.Serializable;
import java.util.Objects;
import java.util.UUID;

public class QuestionId implements Serializable {

    private static final long serialVersionUID = 1L;

    private UUID id;
    private UUID classSubject;

    public QuestionId() {}

    public QuestionId(UUID id, UUID classSubject) {
        this.id = id;
        this.classSubject = classSubject;
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getClassSubject() {
        return classSubject;
    }

    public void setClassSubject(UUID classSubject) {
        this.classSubject = classSubject;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        QuestionId that = (QuestionId) o;
        return Objects.equals(id, that.id) && Objects.equals(classSubject, that.classSubject);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id, classSubject);
    }
}
