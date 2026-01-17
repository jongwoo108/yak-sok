from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('users', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='emergency_relation',
            field=models.CharField(blank=True, max_length=50, verbose_name='비상 연락처 관계'),
        ),
        migrations.AddField(
            model_name='user',
            name='emergency_name',
            field=models.CharField(blank=True, max_length=50, verbose_name='비상 연락처 이름'),
        ),
    ]
