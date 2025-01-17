package org.akashihi.mdg.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonInclude;
import edu.umd.cs.findbugs.annotations.SuppressFBWarnings;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;
import org.hibernate.Hibernate;

import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.JoinColumn;
import javax.persistence.ManyToOne;
import javax.persistence.Transient;
import java.math.BigDecimal;

@Getter
@Setter
@ToString
@Entity
public class Operation {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @JsonIgnore
    private Long id;
    @ManyToOne
    @JoinColumn(name="tx_id", nullable = false)
    @JsonIgnore
    private Transaction transaction;
    private BigDecimal rate;
    private BigDecimal amount;
    @ManyToOne
    @JoinColumn(name="account_id", nullable = false)
    @JsonInclude(JsonInclude.Include.NON_NULL)
    private Account account;
    @Transient
    private Long account_id;

    @Override
    @SuppressFBWarnings(value = "BC_EQUALS_METHOD_SHOULD_WORK_FOR_ALL_OBJECTS", justification = "Checked with Hibernate.getClass()")
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (o == null || Hibernate.getClass(this) != Hibernate.getClass(o)) {
            return false;
        }
        Operation operation = (Operation) o;
        return id != null && id.equals(operation.id);
    }

    @Override
    public int hashCode() {
        return getClass().hashCode();
    }
}
