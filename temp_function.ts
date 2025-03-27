  /**
   * Cria usuário administrador de suporte para a aplicação
   */
  private _createTestUsersAndEvents() {
    console.log("Criando usuário administrador de suporte...");
    
    // Criar usuário administrador de suporte (ID 2)
    const adminId = this.userIdCounter++;
    const adminUser: User = {
      id: adminId,
      username: "00000000000", // CPF do admin de suporte
      // Hash gerada para a senha "Admin@123" 
      password: "445c678c04146877b6fb1cd930af60213a78b098e05b8a6a4ff9dbf4ff8bafa01c6b05b851f43f27d4bb3dcb7504e8645a026013cd91901704d24ae5eeec03c0.73b9deb7c7cd0891f61221d27b10b44a",
      firstName: "Suporte",
      lastName: "Baco",
      birthDate: "2000-01-01",
      email: "suporte@bacoexperiencias.com.br",
      phone: "11999999999",
      rg: "000000000",
      tituloEleitor: "000000000000",
      zodiacSign: "Capricórnio",
      profileImage: null,
      biography: "Administrador de suporte técnico do Baco.",
      instagramUsername: "baco.suporte",
      threadsUsername: "baco.suporte",
      city: "São Paulo",
      state: "SP",
      interests: null,
      isActive: true,
      lastLogin: null,
      createdAt: new Date(),
      emailVerified: true,
      phoneVerified: true,
      documentVerified: true,
      twoFactorEnabled: false,
      twoFactorSecret: null,
      termsAccepted: true,
      privacyPolicyAccepted: true,
      marketingConsent: true,
      dataProcessingConsent: true,
      termsAcceptedAt: new Date(),
      lastLoginIP: null,
      lastUserAgent: null,
      deviceIds: null,
      googleId: null,
      // Campos para validação de documentos
      documentRgImage: null,
      documentCpfImage: null,
      documentSelfieImage: null,
      documentRejectionReason: null,
      documentReviewedAt: null,
      documentReviewedBy: null,
      // Campos de permissões administrativas
      isAdmin: true,
      isSuperAdmin: true,
      adminSince: new Date(),
      adminPermissions: JSON.stringify({
        manageUsers: true,
        manageEvents: true,
        approveDocuments: true,
        manageCategories: true,
        viewAllData: true,
        accessDashboard: true
      })
    };
    this.usersMap.set(adminId, adminUser);
    console.log(`Usuário administrador criado: ${adminId} - ${adminUser.firstName} ${adminUser.lastName}`);
    
    // Mantém apenas o workshop do Kevin
    const kevinEventId = this.eventIdCounter++;
    const kevinEvent: Event = {
      id: kevinEventId,
      name: "Workshop de Fotografia",
      description: "Workshop exclusivo de fotografia com profissionais renomados. Vagas limitadas.",
      date: "2025-04-15",
      timeStart: "14:00",
      timeEnd: "18:00",
      location: "Estúdio Fotográfico Central, Bauru-SP",
      coordinates: "-22.3156,-49.0709",
      coverImage: "https://images.unsplash.com/photo-1452587925148-ce544e77e70d?q=80&w=2074&auto=format&fit=crop",
      eventType: "private_application",
      categoryId: 4, // Reunião
      creatorId: 1, // Kevin
      capacity: 15,
      ticketPrice: 0,
      isActive: true,
      createdAt: new Date(),
      importantInfo: "Traga sua própria câmera. Haverá alguns modelos disponíveis para empréstimo.",
      additionalTickets: null,
      paymentMethods: null
    };
    this.eventsMap.set(kevinEventId, kevinEvent);
    console.log(`Evento mantido: ${kevinEventId} - ${kevinEvent.name} (Criador: Kevin)`);

    console.log("Configuração de usuários e eventos concluída!");
    console.log(`Total de usuários: ${this.usersMap.size}`);
    console.log(`Total de eventos: ${this.eventsMap.size}`);
  }