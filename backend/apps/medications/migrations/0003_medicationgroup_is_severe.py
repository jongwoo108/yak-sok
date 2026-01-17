from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('medications', '0002_alter_medication_options_medicationgroup_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='medicationgroup',
            name='is_severe',
            field=models.BooleanField(default=False, verbose_name='중증 질환 여부'),
        ),
    ]
